import jwt from "jsonwebtoken";
import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

/**
 * Signs a JWT that identifies the user. Only the id is trusted later; the
 * role is re-read from the database by the `protect` middleware.
 *
 * @param {import("mongoose").Document & { _id: unknown, role: string }} user
 * @returns {string}
 */
const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  });

/**
 * POST /api/auth/register
 * Creates a staff account. The role is never taken from the request body, so
 * nobody can register themselves as an admin.
 */
export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const user = await User.create({ name, email, password, role: "staff" });

  res.status(201).json({ success: true, data: { token: signToken(user), user } });
});

/**
 * POST /api/auth/login
 * Uses one generic message for unknown email and wrong password so attackers
 * cannot tell which emails are registered.
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized("Invalid email or password");
  }
  if (!user.isActive) {
    throw ApiError.forbidden("Your account has been deactivated. Please contact an administrator.");
  }

  res.json({ success: true, data: { token: signToken(user), user } });
});

/** GET /api/auth/me: the user loaded by `protect`. */
export const getMe = (req, res) => {
  res.json({ success: true, data: req.user });
};
