import User from "../models/User.js";
import { ACTIVE_FILTER } from "../models/plugins/archivable.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { pick } from "../utils/helpers.js";

/** GET /api/users: active (not archived) accounts, newest first (admin only). */
export const getUsers = asyncHandler(async (_req, res) => {
  const users = await User.find(ACTIVE_FILTER).sort({ createdAt: -1 });
  res.json({ success: true, data: users });
});

/**
 * POST /api/users: an admin adds an account with a temporary password and
 * chooses its role (public registration can only create staff).
 */
export const createUser = asyncHandler(async (req, res) => {
  const user = await User.create(pick(req.body, ["name", "email", "password", "role"]));
  res.status(201).json({ success: true, data: user, message: "User created" });
});

/**
 * PATCH /api/users/:id: edit name, email, role and/or active status (admin only).
 * Admins cannot demote or deactivate themselves, which guarantees the
 * system is never left without an active admin by accident.
 */
export const updateUser = asyncHandler(async (req, res) => {
  const updates = pick(req.body, ["name", "email", "role", "isActive"]);
  const isSelf = req.params.id === req.user.id;

  if (isSelf && ((updates.role && updates.role !== "admin") || updates.isActive === false)) {
    throw ApiError.badRequest("You cannot demote or deactivate your own account");
  }

  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound("User not found");
  if (user.archived) throw ApiError.conflict("Archived users cannot be edited. Restore the account first.");

  user.set(updates);
  await user.save();

  res.json({ success: true, data: user, message: "User updated" });
});
