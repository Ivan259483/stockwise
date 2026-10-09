import mongoose from "mongoose";

/** A product grouping such as "Hand Tools" or "Plumbing". Names are unique. */
const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      maxlength: [50, "Category name must be at most 50 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [300, "Description must be at most 300 characters"],
      default: "",
    },
  },
  { timestamps: true }
);

// Unique, case-insensitive: "Plumbing" and "plumbing" count as duplicates.
categorySchema.index({ name: 1 }, { unique: true, collation: { locale: "en", strength: 2 } });

categorySchema.set("toJSON", { versionKey: false });

export default mongoose.model("Category", categorySchema);
