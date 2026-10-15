import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { passwordResetEmail } from "../services/emailTemplates.js";
import { sendMail } from "../services/mailer.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { RESET_CODE_COOLDOWN_SECONDS, RESET_CODE_MAX_ATTEMPTS, RESET_CODE_TTL_MINUTES } from "../utils/constants.js";
import { pick } from "../utils/helpers.js";

/**
 * Signs a JWT that identifies the user. Only the id and token version are
 * trusted later; the role is re-read from the database by `protect`.
 *
 * @param {import("mongoose").Document & { _id: unknown, role: string }} user
 * @returns {string}
 */
const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role, tv: user.tokenVersion ?? 0 }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  });

/** Same answer whether or not the email exists, so accounts cannot be discovered. */
const RESET_REQUEST_MESSAGE =
  "If an account with that email exists, we sent a 6-digit code to it. The code expires in 15 minutes.";

const INVALID_CODE_MESSAGE = "The code is invalid or has expired. Please request a new one.";

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

/**
 * PATCH /api/auth/me
 * Lets any signed-in user update their own name and email. Role and status
 * are not editable here (only an admin can change those on the Users page).
 */
export const updateProfile = asyncHandler(async (req, res) => {
  req.user.set(pick(req.body, ["name", "email"]));
  await req.user.save();
  res.json({ success: true, data: req.user, message: "Profile updated" });
});

/**
 * PATCH /api/auth/me/password
 * Requires the current password. Changing it signs out every other session
 * (see passwordChangedAt), so a fresh token is returned for this one.
 */
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select("+password");

  if (!(await user.comparePassword(currentPassword))) {
    const message = "Current password is incorrect";
    throw ApiError.badRequest(message, [{ field: "currentPassword", message }]);
  }
  if (await user.comparePassword(newPassword)) {
    const message = "New password must be different from the current one";
    throw ApiError.badRequest(message, [{ field: "newPassword", message }]);
  }

  user.password = newPassword;
  await user.save();

  res.json({ success: true, data: { token: signToken(user), user }, message: "Password changed" });
});

/**
 * POST /api/auth/forgot-password
 * Emails a 6-digit code. Only its bcrypt hash is stored, it expires after 15
 * minutes, and a new code is issued at most once a minute per account (extra
 * requests are ignored silently). The endpoint is also rate-limited per IP.
 * The response is identical for unknown, inactive and valid emails.
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email }).select("+resetRequestedAt");
  const respond = () => res.json({ success: true, message: RESET_REQUEST_MESSAGE });

  if (!user || !user.isActive || user.archived) return respond();

  const cooldownMs = RESET_CODE_COOLDOWN_SECONDS * 1000;
  if (user.resetRequestedAt && Date.now() - user.resetRequestedAt.getTime() < cooldownMs) return respond();

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  user.set({
    resetCodeHash: await bcrypt.hash(code, 10),
    resetCodeExpires: new Date(Date.now() + RESET_CODE_TTL_MINUTES * 60 * 1000),
    resetCodeAttempts: 0,
    resetRequestedAt: new Date(),
  });
  await user.save();

  try {
    await sendMail({ to: user.email, ...passwordResetEmail({ name: user.name, code }) });
  } catch (error) {
    // Logged only; the response stays generic so it cannot be used to probe accounts.
    console.error(`[mail] Password reset email to ${user.email} failed:`, error.message);
    if (process.env.NODE_ENV !== "production") console.log(`[mail] Development copy of the code: ${code}`);
  }

  respond();
});

/**
 * POST /api/auth/reset-password
 * Checks the code (at most 5 wrong guesses per code), sets the new password,
 * clears the code and signs out existing sessions.
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const { email, code, password } = req.body;
  const user = await User.findOne({ email }).select("+resetCodeHash +resetCodeExpires +resetCodeAttempts");

  const usable =
    user?.isActive &&
    !user.archived &&
    user.resetCodeHash &&
    user.resetCodeExpires > new Date() &&
    user.resetCodeAttempts < RESET_CODE_MAX_ATTEMPTS;
  if (!usable) throw ApiError.badRequest(INVALID_CODE_MESSAGE, [{ field: "code", message: INVALID_CODE_MESSAGE }]);

  if (!(await bcrypt.compare(code, user.resetCodeHash))) {
    // Atomic increment so parallel guesses cannot exceed the attempt limit.
    const updated = await User.findByIdAndUpdate(
      user._id,
      { $inc: { resetCodeAttempts: 1 } },
      { returnDocument: "after" }
    ).select("+resetCodeAttempts");
    const left = Math.max(RESET_CODE_MAX_ATTEMPTS - updated.resetCodeAttempts, 0);
    const message = left > 0 ? `Incorrect code. ${left} attempt${left === 1 ? "" : "s"} left.` : INVALID_CODE_MESSAGE;
    throw ApiError.badRequest(message, [{ field: "code", message }]);
  }

  user.password = password;
  user.clearResetCode();
  await user.save();

  res.json({ success: true, message: "Your password has been reset. You can now log in." });
});
