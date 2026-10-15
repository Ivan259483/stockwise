import mongoose from "mongoose";
import { MAX_PO_ITEMS, PO_EVENTS, PO_STATUSES } from "../utils/constants.js";

const { ObjectId } = mongoose.Schema.Types;

/**
 * One product line on a purchase order. Name, SKU and unit are snapshots taken
 * when the PO is created, so the PO stays readable if the product changes later.
 */
const itemSchema = new mongoose.Schema(
  {
    product: { type: ObjectId, ref: "Product", required: true },
    productName: { type: String, required: true },
    sku: { type: String, required: true },
    unit: { type: String, default: "pcs" },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [1, "Quantity must be at least 1"],
      validate: { validator: Number.isInteger, message: "Quantity must be a whole number" },
    },
    unitCost: { type: Number, required: [true, "Unit cost is required"], min: [0, "Unit cost cannot be negative"] },
    lineTotal: { type: Number, default: 0 },
  },
  { _id: false }
);

/** One entry on the PO timeline: who did what, and when. */
const eventSchema = new mongoose.Schema(
  {
    action: { type: String, enum: PO_EVENTS, required: true },
    by: { type: ObjectId, ref: "User", required: true },
    at: { type: Date, default: Date.now },
    note: { type: String, trim: true, maxlength: 300, default: "" },
  },
  { _id: false }
);

/**
 * A request to buy stock from a supplier.
 *
 * Status changes only through the workflow endpoints, each of which updates
 * the document atomically on the condition that it is still in the expected
 * status, so two people can never approve or receive the same PO twice.
 */
const purchaseOrderSchema = new mongoose.Schema(
  {
    poNumber: { type: String, required: true, unique: true },
    supplier: { type: ObjectId, ref: "Supplier", required: [true, "Supplier is required"] },
    supplierName: { type: String, required: true },
    items: {
      type: [itemSchema],
      validate: [
        { validator: (items) => items.length > 0, message: "Add at least one item" },
        { validator: (items) => items.length <= MAX_PO_ITEMS, message: `A PO can have at most ${MAX_PO_ITEMS} items` },
      ],
    },
    totalAmount: { type: Number, default: 0 },
    notes: { type: String, trim: true, maxlength: [500, "Notes must be at most 500 characters"], default: "" },
    status: { type: String, enum: PO_STATUSES, default: "Requested" },

    requestedBy: { type: ObjectId, ref: "User", required: true },
    approvedBy: { type: ObjectId, ref: "User", default: null },
    approvedAt: { type: Date, default: null },
    rejectedBy: { type: ObjectId, ref: "User", default: null },
    rejectedAt: { type: Date, default: null },
    rejectionReason: { type: String, trim: true, default: "" },
    receivedBy: { type: ObjectId, ref: "User", default: null },
    receivedAt: { type: Date, default: null },
    cancelledBy: { type: ObjectId, ref: "User", default: null },
    cancelledAt: { type: Date, default: null },
    cancellationReason: { type: String, trim: true, default: "" },

    history: { type: [eventSchema], default: [] },
  },
  { timestamps: true }
);

/** Line totals and the PO total are always derived from the items, never trusted from the client. */
purchaseOrderSchema.pre("validate", function computeTotals() {
  let total = 0;
  for (const item of this.items) {
    item.lineTotal = Math.round(item.quantity * item.unitCost * 100) / 100;
    total += item.lineTotal;
  }
  this.totalAmount = Math.round(total * 100) / 100;
});

// The list is filtered by status and read newest first; the archive checks look up open POs by product/supplier.
purchaseOrderSchema.index({ status: 1, createdAt: -1 });
purchaseOrderSchema.index({ supplier: 1, status: 1 });
purchaseOrderSchema.index({ "items.product": 1, status: 1 });

purchaseOrderSchema.set("toJSON", { versionKey: false });

export default mongoose.model("PurchaseOrder", purchaseOrderSchema);
