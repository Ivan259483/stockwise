import mongoose from "mongoose";

/**
 * Named sequence numbers (e.g. "purchaseOrder" → 12). `$inc` with upsert is
 * atomic, so two POs created at the same moment never get the same number.
 */
const counterSchema = new mongoose.Schema({ _id: { type: String, required: true }, seq: { type: Number, default: 0 } });

/**
 * Returns the next number in the named sequence.
 * @param {string} name
 * @returns {Promise<number>}
 */
counterSchema.statics.next = async function next(name) {
  const counter = await this.findByIdAndUpdate(name, { $inc: { seq: 1 } }, { upsert: true, returnDocument: "after" });
  return counter.seq;
};

export default mongoose.model("Counter", counterSchema);
