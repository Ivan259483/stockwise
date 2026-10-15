import Product from "../models/Product.js";
import Supplier from "../models/Supplier.js";
import { ACTIVE_FILTER } from "../models/plugins/archivable.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { pick } from "../utils/helpers.js";

const FIELDS = ["name", "contactPerson", "phone", "email", "address"];

/**
 * GET /api/suppliers: active suppliers sorted by name, each with the number of
 * active products it supplies. Archived suppliers appear only on the Archive page.
 */
export const getSuppliers = asyncHandler(async (_req, res) => {
  const suppliers = await Supplier.aggregate([
    { $match: ACTIVE_FILTER },
    {
      $lookup: {
        from: Product.collection.name,
        localField: "_id",
        foreignField: "supplier",
        pipeline: [{ $match: ACTIVE_FILTER }, { $project: { _id: 1 } }],
        as: "products",
      },
    },
    { $addFields: { productCount: { $size: "$products" } } },
    { $project: { products: 0, __v: 0, archiveLog: 0 } },
    { $sort: { name: 1 } },
  ]).collation({ locale: "en" });

  res.json({ success: true, data: suppliers });
});

/** POST /api/suppliers (admin) */
export const createSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.create(pick(req.body, FIELDS));
  res.status(201).json({ success: true, data: supplier, message: "Supplier created" });
});

/** PUT /api/suppliers/:id (admin) */
export const updateSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findById(req.params.id);
  if (!supplier) throw ApiError.notFound("Supplier not found");
  if (supplier.archived) throw ApiError.conflict("Archived suppliers cannot be edited. Restore it first.");

  supplier.set(pick(req.body, FIELDS));
  await supplier.save();

  res.json({ success: true, data: supplier, message: "Supplier updated" });
});
