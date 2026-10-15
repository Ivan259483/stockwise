import mongoose from "mongoose";
import StockMovement from "../models/StockMovement.js";
import * as stock from "../services/stockService.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { parseDateBoundary } from "../utils/dates.js";
import { getPagination, paginated } from "../utils/helpers.js";
import { MOVEMENT_TYPES } from "../utils/constants.js";

/** Shapes the response returned by both stock endpoints. */
const movementResponse = async ({ movement, product }) => {
  await movement.populate("performedBy", "name");
  return { success: true, data: { movement, product }, message: `Stock ${movement.type.toLowerCase()} recorded` };
};

/** POST /api/stock/in (atomic `$inc`, see services/stockService.js). */
export const stockIn = asyncHandler(async (req, res) => {
  const { productId, quantity, reason, note } = req.body;
  const result = await stock.stockIn({ productId, quantity, reason, note, userId: req.user._id });
  res.status(201).json(await movementResponse(result));
});

/** POST /api/stock/out (atomic guarded decrement; 409 when stock is insufficient). */
export const stockOut = asyncHandler(async (req, res) => {
  const { productId, quantity, reason, note } = req.body;
  const result = await stock.stockOut({ productId, quantity, reason, note, userId: req.user._id });
  res.status(201).json(await movementResponse(result));
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
