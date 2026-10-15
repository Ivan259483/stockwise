import rateLimit from "express-rate-limit";
import ApiError from "../utils/ApiError.js";

const FIFTEEN_MINUTES = 15 * 60 * 1000;

/**
 * Builds an IP-based limiter that answers with the standard 429 error shape.
 * @param {{ limit: number, skipSuccessfulRequests?: boolean, message: string }} options
 */
const createLimiter = ({ limit, skipSuccessfulRequests = false, message }) =>
  rateLimit({
    windowMs: FIFTEEN_MINUTES,
    limit,
    skipSuccessfulRequests,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (_req, _res, next) => next(new ApiError(429, message)),
  });

/**
 * Limits failed login/register attempts per IP to slow down password guessing.
 * Successful requests are not counted, so normal use is never blocked.
 */
export const authLimiter = createLimiter({
  limit: 20,
  skipSuccessfulRequests: true,
  message: "Too many attempts. Please wait 15 minutes and try again.",
});

/**
 * Limits "Forgot password?" requests per IP (every request counts, because each
 * one can send an email). RESET_RATE_LIMIT can raise it for automated tests.
 */
export const forgotPasswordLimiter = createLimiter({
  limit: Number(process.env.RESET_RATE_LIMIT) || 5,
  message: "Too many password reset requests. Please wait 15 minutes and try again.",
});

/** Limits failed reset-code guesses per IP (each code also allows only 5 wrong guesses). */
export const resetPasswordLimiter = createLimiter({
  limit: Number(process.env.RESET_RATE_LIMIT) || 10,
  skipSuccessfulRequests: true,
  message: "Too many attempts. Please wait 15 minutes and try again.",
});
