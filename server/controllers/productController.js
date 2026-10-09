import mongoose from "mongoose";
import Category from "../models/Category.js";
import Product from "../models/Product.js";
import StockMovement from "../models/StockMovement.js";
import Supplier from "../models/Supplier.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { escapeRegex, getPagination, paginated, pick } from "../utils/helpers.js";

/** Fields an admin may set through create/update. `quantity` is handled separately. */
const EDITABLE_FIELDS = [
  "name",
  "sku",
  "category",
  "supplier",
  "description",
  "unit",
  "costPrice",
  "sellingPrice",
  "reorderLevel",
  "image",
];

/** Whitelisted `?sort=` values mapped to MongoDB sort specs (`_id` keeps paging stable). */
const SORTS = {
  name: { name: 1, _id: 1 },
  "-name": { name: -1, _id: 1 },
  quantity: { quantity: 1, _id: 1 },
  "-quantity": { quantity: -1, _id: 1 },
  price: { sellingPrice: 1, _id: 1 },
  "-price": { sellingPrice: -1, _id: 1 },
  createdAt: { createdAt: 1, _id: 1 },
  "-createdAt": { createdAt: -1, _id: 1 },
};

/**
 * MongoDB filters for each `?status=` value. They mirror the `stockStatus`
 * virtual, using $expr because "low" compares two fields of the same document.
 */
const STATUS_FILTERS = {
  out_of_stock: { quantity: { $lte: 0 } },
  low_stock: { quantity: { $gt: 0 }, $expr: { $lte: ["$quantity", "$reorderLevel"] } },
  in_stock: { $expr: { $gt: ["$quantity", "$reorderLevel"] } },
};

/**
 * Confirms that the referenced category (and supplier, if any) exist, so a
 * product never points at a missing document.
 *
 * @param {{ category?: string, supplier?: string|null }} fields
 */
const assertReferencesExist = async ({ category, supplier }) => {
  const errors = [];
  if (category && !(await Category.exists({ _id: category }))) {
    errors.push({ field: "category", message: "Selected category does not exist" });
  }
  if (supplier && !(await Supplier.exists({ _id: supplier }))) {
    errors.push({ field: "supplier", message: "Selected supplier does not exist" });
  }
  if (errors.length) throw ApiError.badRequest(errors[0].message, errors);
};

/**
 * Whitelists the editable fields and turns an empty supplier ("" from the
 * form's "None" option) into null.
 *
 * @param {Record<string, unknown>} body
 */
const readProductFields = (body) => {
  const fields = pick(body, EDITABLE_FIELDS);
  if ("supplier" in fields && !fields.supplier) fields.supplier = null;
  return fields;
};

/**
 * GET /api/products?search=&category=&status=&sort=&page=&limit=
 * Images are excluded from the list because they can be up to 1 MB each.
 */
export const getProducts = asyncHandler(async (req, res) => {
  const { search, category, status, sort = "name" } = req.query;
  const filter = {};

  if (search?.trim()) {
    const pattern = new RegExp(escapeRegex(search.trim()), "i");
    filter.$or = [{ name: pattern }, { sku: pattern }];
  }

  if (category) {
    if (!mongoose.isValidObjectId(category)) throw ApiError.badRequest("Invalid category ID");
    filter.category = category;
  }

  if (status) {
    if (!STATUS_FILTERS[status]) throw ApiError.badRequest("Status must be in_stock, low_stock or out_of_stock");
    Object.assign(filter, STATUS_FILTERS[status]);
  }

  if (!SORTS[sort]) throw ApiError.badRequest(`Sort must be one of: ${Object.keys(SORTS).join(", ")}`);

  const pagination = getPagination(req.query, 10);
  const [products, total] = await Promise.all([
    Product.find(filter)
      .select("-image")
      .populate("category", "name")
      .populate("supplier", "name")
      .sort(SORTS[sort])
      .skip(pagination.skip)
      .limit(pagination.limit),
    Product.countDocuments(filter),
  ]);

  res.json(paginated(products, total, pagination));
});

/** GET /api/products/:id: the product plus its 20 most recent movements. */
export const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
    .populate("category", "name")
    .populate("supplier", "name contactPerson phone email");
  if (!product) throw ApiError.notFound("Product not found");

  const movements = await StockMovement.find({ product: product._id })
    .sort({ createdAt: -1 })
    .limit(20)
    .populate("performedBy", "name");

  res.json({ success: true, data: { product, movements } });
});

/**
 * POST /api/products (admin)
 * An opening quantity is recorded as an IN movement so the history always
 * explains how the current stock level was reached.
 */
export const createProduct = asyncHandler(async (req, res) => {
  const fields = readProductFields(req.body);
  await assertReferencesExist(fields);

  const quantity = req.body.quantity ?? 0;
  const product = await Product.create({ ...fields, quantity });

  if (quantity > 0) {
    await StockMovement.create({
      product: product._id,
      productName: product.name,
      sku: product.sku,
      type: "IN",
      quantity,
      previousQty: 0,
      newQty: quantity,
      reason: "Adjustment",
      note: "Opening stock",
      performedBy: req.user._id,
    });
  }

  await product.populate([
    { path: "category", select: "name" },
    { path: "supplier", select: "name" },
  ]);
  res.status(201).json({ success: true, data: product, message: "Product created" });
});

/**
 * PUT /api/products/:id (admin)
 * `quantity` is intentionally not editable here: stock levels change only
 * through stock in/out so every change is audited.
 */
export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw ApiError.notFound("Product not found");

  const fields = readProductFields(req.body);
  await assertReferencesExist(fields);

  product.set(fields);
  await product.save();

  await product.populate([
    { path: "category", select: "name" },
    { path: "supplier", select: "name" },
  ]);
  res.json({ success: true, data: product, message: "Product updated" });
});

/**
 * DELETE /api/products/:id (admin)
 * Stock movements are kept: they store name/SKU snapshots for the audit trail.
 */
export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) throw ApiError.notFound("Product not found");

  res.json({ success: true, data: { _id: product._id }, message: "Product deleted" });
});
