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
    /** When the password was last changed (shown on the profile page). */
    passwordChangedAt: { type: Date, default: null },
    /** Copied into every JWT; bumping it on a password change invalidates all older tokens. */
    tokenVersion: { type: Number, default: 0 },
    // Password recovery: only a bcrypt hash of the 6-digit code is stored, never the code.
    resetCodeHash: { type: String, select: false, default: null },
    resetCodeExpires: { type: Date, select: false, default: null },
    resetCodeAttempts: { type: Number, select: false, default: 0 },
    resetRequestedAt: { type: Date, select: false, default: null },
  },
  { timestamps: true }
);

/**
 * Hash the password whenever it is set or changed, never store plain text.
 * A change (not the first save) also bumps tokenVersion, which signs out every
 * session that was started with the old password.
 */
userSchema.pre("save", async function hashPassword() {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
  if (!this.isNew) {
    this.passwordChangedAt = new Date();
    this.tokenVersion = (this.tokenVersion ?? 0) + 1;
  }
});

/**
 * Compares a plain-text candidate with the stored hash.
 * @param {string} candidate
 * @returns {Promise<boolean>}
 */
userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

/**
 * True when a JWT was issued before the last password change (its version is older).
 * Tokens from before this field existed carry no version and count as version 0.
 * @param {{ tv?: number }} payload Decoded JWT payload.
 */
userSchema.methods.isTokenOutdated = function isTokenOutdated(payload) {
  return (payload.tv ?? 0) !== (this.tokenVersion ?? 0);
};

/** Removes any pending password-reset code. */
userSchema.methods.clearResetCode = function clearResetCode() {
  this.set({ resetCodeHash: null, resetCodeExpires: null, resetCodeAttempts: 0 });
};

/** Fields that must never leave the server, even if a query selected them. */
const PRIVATE_FIELDS = [
  "password",
  "tokenVersion",
  "resetCodeHash",
  "resetCodeExpires",
  "resetCodeAttempts",
  "resetRequestedAt",
];

userSchema.set("toJSON", {
  versionKey: false,
  transform: (_doc, ret) => {
    for (const field of PRIVATE_FIELDS) delete ret[field];
    return ret;
  },
});

export default mongoose.model("User", userSchema);
