import Product from "../models/Product.js";
import Supplier from "../models/Supplier.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { pick } from "../utils/helpers.js";

const FIELDS = ["name", "contactPerson", "phone", "email", "address"];

/** GET /api/suppliers: sorted by name, each with the number of products it supplies. */
export const getSuppliers = asyncHandler(async (_req, res) => {
  const suppliers = await Supplier.aggregate([
    {
      $lookup: {
        from: Product.collection.name,
        localField: "_id",
        foreignField: "supplier",
        pipeline: [{ $project: { _id: 1 } }],
        as: "products",
      },
    },
    { $addFields: { productCount: { $size: "$products" } } },
    { $project: { products: 0, __v: 0 } },
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

  supplier.set(pick(req.body, FIELDS));
  await supplier.save();

  res.json({ success: true, data: supplier, message: "Supplier updated" });
});

/**
 * DELETE /api/suppliers/:id (admin)
 * The supplier is optional on products, so instead of blocking the delete we
 * unset it on every product that referenced it.
 */
export const deleteSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findByIdAndDelete(req.params.id);
  if (!supplier) throw ApiError.notFound("Supplier not found");

  const { modifiedCount } = await Product.updateMany({ supplier: supplier._id }, { $unset: { supplier: 1 } });

  res.json({
    success: true,
    data: { _id: supplier._id, productsUpdated: modifiedCount },
    message: "Supplier deleted",
  });
});
