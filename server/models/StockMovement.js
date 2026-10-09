import mongoose from "mongoose";
import { MOVEMENT_REASONS, MOVEMENT_TYPES } from "../utils/constants.js";

/**
 * One stock IN or OUT event, the audit trail of who changed what and when.
 *
 * `productName` and `sku` are snapshots copied at the time of the movement so
 * the history stays readable even after the product is renamed or deleted.
 */
const stockMovementSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    productName: { type: String, required: true },
    sku: { type: String, required: true },
    type: { type: String, enum: MOVEMENT_TYPES, required: [true, "Movement type is required"] },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [1, "Quantity must be at least 1"],
      validate: { validator: Number.isInteger, message: "Quantity must be a whole number" },
    },
    previousQty: { type: Number, required: true },
    newQty: { type: Number, required: true },
    reason: {
      type: String,
      enum: { values: MOVEMENT_REASONS, message: "Invalid reason" },
      required: [true, "Reason is required"],
    },
    note: { type: String, trim: true, maxlength: [300, "Note must be at most 300 characters"], default: "" },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

// History is always read newest-first, optionally filtered by product or type.
stockMovementSchema.index({ createdAt: -1 });
stockMovementSchema.index({ product: 1, createdAt: -1 });

stockMovementSchema.set("toJSON", { versionKey: false });

export default mongoose.model("StockMovement", stockMovementSchema);
