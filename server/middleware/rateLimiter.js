import rateLimit from "express-rate-limit";
import ApiError from "../utils/ApiError.js";

/**
 * Limits failed login/register attempts per IP to slow down password guessing.
 * Successful requests are not counted, so normal use is never blocked.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(new ApiError(429, "Too many attempts. Please wait 15 minutes and try again."));
  },
});
