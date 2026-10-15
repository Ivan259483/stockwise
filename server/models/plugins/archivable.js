import mongoose from "mongoose";

/**
 * Soft delete ("archive") for products, suppliers, users and purchase orders.
 *
 * Archived records are hidden from every active list, search and dropdown but
 * never deleted, so stock movements and purchase orders that reference them
 * stay intact. `archiveLog` keeps every archive/restore with who, when and why.
 *
 * Queries use `{ archived: { $ne: true } }` (see ACTIVE_FILTER) rather than
 * `{ archived: false }`, so records created before this field existed still
 * count as active without a data migration.
 */
export const ACTIVE_FILTER = Object.freeze({ archived: { $ne: true } });

const { ObjectId } = mongoose.Schema.Types;

const logEntrySchema = new mongoose.Schema(
  {
    action: { type: String, enum: ["Archived", "Restored"], required: true },
    by: { type: ObjectId, ref: "User", required: true },
    at: { type: Date, default: Date.now },
    reason: { type: String, trim: true, maxlength: 300, default: "" },
  },
  { _id: false }
);

/** @param {mongoose.Schema} schema */
export default function archivable(schema) {
  schema.add({
    archived: { type: Boolean, default: false },
    archivedAt: { type: Date, default: null },
    archivedBy: { type: ObjectId, ref: "User", default: null },
    archiveReason: { type: String, trim: true, maxlength: 300, default: "" },
    archiveLog: { type: [logEntrySchema], default: [] },
  });
  // The Archive page lists archived records newest first.
  schema.index({ archived: 1, archivedAt: -1 });
}
