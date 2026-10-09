import mongoose from "mongoose";
import Product from "../models/Product.js";
import StockMovement from "../models/StockMovement.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { parseDateBoundary } from "../utils/dates.js";
import { getPagination, paginated } from "../utils/helpers.js";
import { MOVEMENT_TYPES } from "../utils/constants.js";

/**
 * Writes the audit record for a quantity change that has already been applied.
 * If writing the record fails, the quantity change is rolled back so stock
 * levels never change without a matching history entry.
 *
 * @param {object} params
 * @param {import("mongoose").Document} params.product The product after the update.
 * @param {"IN"|"OUT"} params.type
 * @param {number} params.quantity
 * @param {string} params.reason
 * @param {string} [params.note]
 * @param {import("mongoose").Types.ObjectId} params.userId
 */
const recordMovement = async ({ product, type, quantity, reason, note, userId }) => {
  const delta = type === "IN" ? quantity : -quantity;
  try {
    return await StockMovement.create({
      product: product._id,
      productName: product.name,
      sku: product.sku,
      type,
      quantity,
      previousQty: product.quantity - delta,
      newQty: product.quantity,
      reason,
      note: note ?? "",
      performedBy: userId,
    });
  } catch (error) {
    await Product.updateOne({ _id: product._id }, { $inc: { quantity: -delta } });
    throw error;
  }
};

/** Shapes the response returned by both stock endpoints. */
const movementResponse = async (movement, product) => {
  await movement.populate("performedBy", "name");
  return { success: true, data: { movement, product }, message: `Stock ${movement.type.toLowerCase()} recorded` };
};

/**
 * POST /api/stock/in
 * `$inc` is atomic, so concurrent stock-ins from two users never overwrite
 * each other (no read-modify-write race).
 */
export const stockIn = asyncHandler(async (req, res) => {
  const { productId, quantity, reason, note } = req.body;

  const product = await Product.findByIdAndUpdate(
    productId,
    { $inc: { quantity } },
    { returnDocument: "after", runValidators: true }
  );
  if (!product) throw ApiError.notFound("Product not found");

  const movement = await recordMovement({ product, type: "IN", quantity, reason, note, userId: req.user._id });
  res.status(201).json(await movementResponse(movement, product));
});

/**
 * POST /api/stock/out
 * The `quantity: { $gte: qty }` condition and the decrement happen in one
 * atomic operation, so stock can never go negative even when two sales are
 * recorded at the same moment.
 */
export const stockOut = asyncHandler(async (req, res) => {
  const { productId, quantity, reason, note } = req.body;

  const product = await Product.findOneAndUpdate(
    { _id: productId, quantity: { $gte: quantity } },
    { $inc: { quantity: -quantity } },
    { returnDocument: "after" }
  );

  if (!product) {
    // Distinguish "no such product" from "not enough stock".
    const existing = await Product.findById(productId).select("quantity");
    if (!existing) throw ApiError.notFound("Product not found");
    const message = `Insufficient stock: only ${existing.quantity} available`;
    throw ApiError.conflict(message, [{ field: "quantity", message }]);
  }

  const movement = await recordMovement({ product, type: "OUT", quantity, reason, note, userId: req.user._id });
  res.status(201).json(await movementResponse(movement, product));
});

/** GET /api/stock/movements?product=&type=&from=&to=&page=&limit= (newest first) */
export const getMovements = asyncHandler(async (req, res) => {
  const { product, type, from, to } = req.query;
  const filter = {};

  if (product) {
    if (!mongoose.isValidObjectId(product)) throw ApiError.badRequest("Invalid ID");
    filter.product = product;
  }

  if (type) {
    if (!MOVEMENT_TYPES.includes(type)) throw ApiError.badRequest("Type must be IN or OUT");
    filter.type = type;
  }

  if (from || to) {
    filter.createdAt = {};
    if (from) {
      const start = parseDateBoundary(from, "start");
      if (!start) throw ApiError.badRequest("Invalid 'from' date");
      filter.createdAt.$gte = start;
    }
    if (to) {
      const end = parseDateBoundary(to, "end");
      if (!end) throw ApiError.badRequest("Invalid 'to' date");
      filter.createdAt.$lte = end;
    }
  }

  const pagination = getPagination(req.query, 15);
  const [movements, total] = await Promise.all([
    StockMovement.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate("performedBy", "name"),
    StockMovement.countDocuments(filter),
  ]);

  res.json(paginated(movements, total, pagination));
});
