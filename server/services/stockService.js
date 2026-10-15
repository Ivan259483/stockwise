/**
 * The only code that changes product quantities.
 *
 * Used by the stock in/out endpoints and by "Receive purchase order", so every
 * quantity change goes through the same atomic update and always leaves a
 * matching StockMovement record.
 */
import Product from "../models/Product.js";
import StockMovement from "../models/StockMovement.js";
import { ACTIVE_FILTER } from "../models/plugins/archivable.js";
import ApiError from "../utils/ApiError.js";
import { alertIfLow, resetAlertIfRestocked } from "./stockAlerts.js";

/** Active products only: archived products cannot receive or lose stock. */
const ACTIVE = ACTIVE_FILTER;

/**
 * Writes the audit record for a quantity change that has already been applied.
 * If writing the record fails, the quantity change is rolled back so stock
 * levels never change without a matching history entry.
 */
const recordMovement = async ({ product, type, quantity, reason, note, userId, purchaseOrder }) => {
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
      purchaseOrder: purchaseOrder?._id ?? null,
      poNumber: purchaseOrder?.poNumber ?? "",
    });
  } catch (error) {
    await Product.updateOne({ _id: product._id }, { $inc: { quantity: -delta } });
    throw error;
  }
};

/** Explains why an atomic update matched no product: missing, archived or (for OUT) not enough stock. */
const explainMiss = async (productId) => {
  const existing = await Product.findById(productId).select("quantity archived name");
  if (!existing) return ApiError.notFound("Product not found");
  if (existing.archived) return ApiError.conflict(`"${existing.name}" is archived and cannot be stocked in or out`);
  const message = `Insufficient stock: only ${existing.quantity} available`;
  return ApiError.conflict(message, [{ field: "quantity", message }]);
};

/**
 * Adds stock. `$inc` is atomic, so concurrent stock-ins from two users never
 * overwrite each other (no read-modify-write race).
 *
 * @param {{ productId: unknown, quantity: number, reason: string, note?: string, userId: unknown, purchaseOrder?: { _id: unknown, poNumber: string } }} params
 * @returns {Promise<{ product: import("mongoose").Document, movement: import("mongoose").Document }>}
 */
export const stockIn = async ({ productId, quantity, reason, note, userId, purchaseOrder }) => {
  const product = await Product.findOneAndUpdate(
    { _id: productId, ...ACTIVE },
    { $inc: { quantity } },
    { returnDocument: "after", runValidators: true }
  );
  if (!product) throw await explainMiss(productId);

  const movement = await recordMovement({ product, type: "IN", quantity, reason, note, userId, purchaseOrder });
  await resetAlertIfRestocked(product);
  return { product, movement };
};

/**
 * Removes stock. The `quantity: { $gte: qty }` condition and the decrement
 * happen in one atomic operation, so stock can never go negative even when
 * two sales are recorded at the same moment.
 *
 * @param {{ productId: unknown, quantity: number, reason: string, note?: string, userId: unknown }} params
 */
export const stockOut = async ({ productId, quantity, reason, note, userId }) => {
  const product = await Product.findOneAndUpdate(
    { _id: productId, ...ACTIVE, quantity: { $gte: quantity } },
    { $inc: { quantity: -quantity } },
    { returnDocument: "after" }
  );
  if (!product) throw await explainMiss(productId);

  const movement = await recordMovement({ product, type: "OUT", quantity, reason, note, userId });
  const alert = await alertIfLow(product);
  return { product, movement, alert };
};

/**
 * Undoes stock-ins made by `stockIn` (used when receiving a PO fails half-way):
 * takes the quantities back off and removes the movements, so the PO can be
 * received again cleanly.
 *
 * @param {Array<{ product: { _id: unknown }, movement: { _id: unknown, quantity: number } }>} applied
 */
export const revertStockIns = async (applied) => {
  for (const { product, movement } of applied) {
    await Product.updateOne({ _id: product._id }, { $inc: { quantity: -movement.quantity } });
    await StockMovement.deleteOne({ _id: movement._id });
  }
};
