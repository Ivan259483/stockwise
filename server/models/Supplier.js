import mongoose from "mongoose";

/** A vendor the store buys stock from. Only `name` is mandatory. */
const supplierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Supplier name is required"],
      trim: true,
      maxlength: [80, "Supplier name must be at most 80 characters"],
    },
    contactPerson: { type: String, trim: true, maxlength: 60, default: "" },
    phone: { type: String, trim: true, maxlength: 30, default: "" },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
      // Optional, but if given it must look like an email.
      match: [/^$|^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },
    address: { type: String, trim: true, maxlength: 200, default: "" },
  },
  { timestamps: true }
);

supplierSchema.set("toJSON", { versionKey: false });

export default mongoose.model("Supplier", supplierSchema);
