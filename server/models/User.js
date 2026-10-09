import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { ROLES } from "../utils/constants.js";

const SALT_ROUNDS = 10;

/**
 * A person who can sign in to StockWise.
 * Public registration always creates `staff`; only an admin can promote.
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [60, "Name must be at most 60 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      // Never returned by queries unless explicitly requested with .select("+password").
      select: false,
    },
    role: { type: String, enum: ROLES, default: "staff" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

/** Hash the password whenever it is set or changed, never store plain text. */
userSchema.pre("save", async function hashPassword() {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
});

/**
 * Compares a plain-text candidate with the stored hash.
 * @param {string} candidate
 * @returns {Promise<boolean>}
 */
userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Defensive: strip the hash even if a query selected it.
userSchema.set("toJSON", {
  versionKey: false,
  transform: (_doc, ret) => {
    delete ret.password;
    return ret;
  },
});

export default mongoose.model("User", userSchema);
