import Category from "../models/Category.js";
import Product from "../models/Product.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { pick } from "../utils/helpers.js";

const FIELDS = ["name", "description"];

/**
 * GET /api/categories
 * Each category includes `productCount` (computed with $lookup) so the UI can
 * show usage and warn before a delete that would be rejected.
 */
export const getCategories = asyncHandler(async (_req, res) => {
  const categories = await Category.aggregate([
    {
      $lookup: {
        from: Product.collection.name,
        localField: "_id",
        foreignField: "category",
        pipeline: [{ $project: { _id: 1 } }],
        as: "products",
      },
    },
    { $addFields: { productCount: { $size: "$products" } } },
    { $project: { products: 0, __v: 0 } },
    { $sort: { name: 1 } },
  ]).collation({ locale: "en" });

  res.json({ success: true, data: categories });
});

/** POST /api/categories (admin). Duplicate names become a 409 in the error handler. */
export const createCategory = asyncHandler(async (req, res) => {
  const category = await Category.create(pick(req.body, FIELDS));
  res.status(201).json({ success: true, data: category, message: "Category created" });
});

/** PUT /api/categories/:id (admin) */
export const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw ApiError.notFound("Category not found");

  category.set(pick(req.body, FIELDS));
  await category.save();

  res.json({ success: true, data: category, message: "Category updated" });
});

/**
 * DELETE /api/categories/:id (admin)
 * Refuses with 409 while products still reference the category, because a
 * product must always belong to a category.
 */
export const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw ApiError.notFound("Category not found");

  const productCount = await Product.countDocuments({ category: category._id });
  if (productCount > 0) {
    throw ApiError.conflict(
      `Cannot delete "${category.name}": ${productCount} product(s) still use this category. Move or delete them first.`
    );
  }

  await category.deleteOne();
  res.json({ success: true, data: { _id: category._id }, message: "Category deleted" });
});
