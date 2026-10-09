import Category from "../models/Category.js";
import Product from "../models/Product.js";
import StockMovement from "../models/StockMovement.js";
import asyncHandler from "../utils/asyncHandler.js";
import { APP_TIMEZONE } from "../utils/constants.js";
import { DAY_MS, startOfLocalDay, toLocalDateString } from "../utils/dates.js";

const CHART_DAYS = 7;

/** Stock value at cost: quantity × costPrice, as an aggregation expression. */
const VALUE_EXPR = { $multiply: ["$quantity", "$costPrice"] };

/** Totals for the stat cards, computed in one pass over the products. */
const getTotals = async () => {
  const [totals] = await Product.aggregate([
    {
      $group: {
        _id: null,
        totalProducts: { $sum: 1 },
        totalUnits: { $sum: "$quantity" },
        totalStockValue: { $sum: VALUE_EXPR },
        lowStockCount: {
          $sum: {
            $cond: [{ $and: [{ $gt: ["$quantity", 0] }, { $lte: ["$quantity", "$reorderLevel"] }] }, 1, 0],
          },
        },
        outOfStockCount: { $sum: { $cond: [{ $lte: ["$quantity", 0] }, 1, 0] } },
      },
    },
    { $project: { _id: 0 } },
  ]);

  const empty = { totalProducts: 0, totalUnits: 0, totalStockValue: 0, lowStockCount: 0, outOfStockCount: 0 };
  const result = totals ?? empty;
  return { ...result, totalStockValue: Math.round(result.totalStockValue * 100) / 100 };
};

/** Stock value grouped by category, highest first (bar chart). */
const getValueByCategory = () =>
  Product.aggregate([
    { $group: { _id: "$category", value: { $sum: VALUE_EXPR }, units: { $sum: "$quantity" }, products: { $sum: 1 } } },
    { $lookup: { from: Category.collection.name, localField: "_id", foreignField: "_id", as: "category" } },
    { $unwind: "$category" },
    {
      $project: {
        _id: 0,
        categoryId: "$_id",
        category: "$category.name",
        value: { $round: ["$value", 2] },
        units: 1,
        products: 1,
      },
    },
    { $sort: { value: -1 } },
  ]);

/**
 * Units moved IN and OUT per day for the last 7 days (line chart).
 * Days with no movement are filled with zeros so the chart has no gaps.
 */
const getMovementsByDay = async () => {
  const since = startOfLocalDay(CHART_DAYS - 1);

  const rows = await StockMovement.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: {
          day: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: APP_TIMEZONE } },
          type: "$type",
        },
        units: { $sum: "$quantity" },
      },
    },
  ]);

  const totals = new Map(rows.map((row) => [`${row._id.day}|${row._id.type}`, row.units]));

  return Array.from({ length: CHART_DAYS }, (_, i) => {
    const date = toLocalDateString(new Date(since.getTime() + i * DAY_MS));
    return { date, in: totals.get(`${date}|IN`) ?? 0, out: totals.get(`${date}|OUT`) ?? 0 };
  });
};

/** GET /api/dashboard/summary: everything the dashboard needs in one request. */
export const getSummary = asyncHandler(async (_req, res) => {
  const [totals, lowStockItems, recentMovements, valueByCategory, movementsByDay] = await Promise.all([
    getTotals(),
    // Out-of-stock items come first because they are the most urgent to restock.
    Product.find({ $expr: { $lte: ["$quantity", "$reorderLevel"] } })
      .select("name sku quantity reorderLevel unit costPrice")
      .sort({ quantity: 1, name: 1 })
      .limit(5),
    StockMovement.find().sort({ createdAt: -1 }).limit(5).populate("performedBy", "name"),
    getValueByCategory(),
    getMovementsByDay(),
  ]);

  res.json({
    success: true,
    data: { ...totals, lowStockItems, recentMovements, valueByCategory, movementsByDay },
  });
});
