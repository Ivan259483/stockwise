import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { pick } from "../utils/helpers.js";

/** GET /api/users: all accounts, newest first (admin only). */
export const getUsers = asyncHandler(async (_req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.json({ success: true, data: users });
});

/**
 * PATCH /api/users/:id: change role and/or active status (admin only).
 * Admins cannot demote or deactivate themselves, which guarantees the
 * system is never left without an active admin by accident.
 */
export const updateUser = asyncHandler(async (req, res) => {
  const updates = pick(req.body, ["role", "isActive"]);
  const isSelf = req.params.id === req.user.id;

  if (isSelf && ((updates.role && updates.role !== "admin") || updates.isActive === false)) {
    throw ApiError.badRequest("You cannot demote or deactivate your own account");
  }

  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound("User not found");

  user.set(updates);
  await user.save();

  res.json({ success: true, data: user, message: "User updated" });
});

/** DELETE /api/users/:id (admin only, never yourself). */
export const deleteUser = asyncHandler(async (req, res) => {
  if (req.params.id === req.user.id) {
    throw ApiError.badRequest("You cannot delete your own account");
  }

  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw ApiError.notFound("User not found");

  res.json({ success: true, data: { _id: user._id }, message: "User deleted" });
});
