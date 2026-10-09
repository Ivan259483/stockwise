import mongoose from "mongoose";
import { MAX_IMAGE_BYTES, UNITS } from "../utils/constants.js";

/**
 * Returns true when `value` is empty, an http(s) URL, or an image data URL
 * whose decoded size is within MAX_IMAGE_BYTES. Images are stored inline so the
 * app needs no separate file storage service, which is why the size is capped.
 *
 * @param {string} value
 * @returns {boolean}
 */
export const isValidImage = (value) => {
  if (!value) return true;
  if (/^https?:\/\/\S+$/i.test(value)) return true;

  const match = /^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,([A-Za-z0-9+/=]+)$/i.exec(value);
  if (!match) return false;

  const base64 = match[2];
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  const bytes = (base64.length * 3) / 4 - padding;
  return bytes <= MAX_IMAGE_BYTES;
};

/** An item the store sells. `quantity` changes only through stock movements after creation. */
const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      maxlength: [100, "Product name must be at most 100 characters"],
    },
    sku: {
      type: String,
      required: [true, "SKU is required"],
      unique: true,
      uppercase: true,
      trim: true,
      match: [/^[A-Z0-9-]{2,30}$/, "SKU may only contain letters, numbers and dashes (2-30 characters)"],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
    },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier", default: null },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description must be at most 500 characters"],
      default: "",
    },
    unit: { type: String, enum: { values: UNITS, message: "Invalid unit" }, default: "pcs" },
    costPrice: { type: Number, min: [0, "Cost price cannot be negative"], default: 0 },
    sellingPrice: { type: Number, min: [0, "Selling price cannot be negative"], default: 0 },
    quantity: {
      type: Number,
      min: [0, "Quantity cannot be negative"],
      default: 0,
      validate: { validator: Number.isInteger, message: "Quantity must be a whole number" },
    },
    reorderLevel: {
      type: Number,
      min: [0, "Reorder level cannot be negative"],
      default: 10,
      validate: { validator: Number.isInteger, message: "Reorder level must be a whole number" },
    },
    image: {
      type: String,
      default: "",
      validate: {
        validator: isValidImage,
        message: "Image must be a URL or an image file of at most 1 MB",
      },
    },
  },
  {
    timestamps: true,
    // Virtuals (stockStatus, stockValue) are part of every JSON response.
    toJSON: { virtuals: true, versionKey: false },
    toObject: { virtuals: true },
    // `_id` is already exposed; skip the duplicate string `id` virtual.
    id: false,
  }
);

/**
 * Text index on name and SKU for whole-word `$text` queries. The list endpoint
 * uses a case-insensitive regex instead, so partial words ("hamm") also match.
 */
productSchema.index({ name: "text", sku: "text" });
/** Supports the category filter and the "category still in use" check. */
productSchema.index({ category: 1 });

/**
 * in_stock / low_stock / out_of_stock. "Low" means at or below the reorder level,
 * which is the point where the owner should buy more.
 */
productSchema.virtual("stockStatus").get(function stockStatus() {
  if (this.quantity <= 0) return "out_of_stock";
  if (this.quantity <= this.reorderLevel) return "low_stock";
  return "in_stock";
});

/** Value of the stock on hand at cost, in pesos. */
productSchema.virtual("stockValue").get(function stockValue() {
  return Math.round(this.quantity * this.costPrice * 100) / 100;
});

export default mongoose.model("Product", productSchema);
