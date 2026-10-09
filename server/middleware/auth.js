import jwt from "jsonwebtoken";
import User from "../models/User.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

/**
 * Requires a valid `Authorization: Bearer <jwt>` header.
 *
 * The user is re-loaded from the database on every request (instead of
 * trusting the token's claims) so a role change or deactivation by an admin
 * takes effect immediately, not when the token expires.
 */
export const protect = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) throw ApiError.unauthorized();

  // Invalid or expired tokens throw JsonWebTokenError/TokenExpiredError -> 401 in errorHandler.
  const payload = jwt.verify(token, process.env.JWT_SECRET);

  const user = await User.findById(payload.id);
  if (!user) throw ApiError.unauthorized("User no longer exists");
  if (!user.isActive) throw ApiError.unauthorized("Your account has been deactivated");

  req.user = user;
  next();
});

/**
 * Allows the request only if the logged-in user has one of `roles`.
 * Must run after `protect`.
 *
 * @param {...("admin"|"staff")} roles
 * @returns {import("express").RequestHandler}
 */
export const authorize =
  (...roles) =>
  (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(ApiError.forbidden());
    }
    next();
  };
