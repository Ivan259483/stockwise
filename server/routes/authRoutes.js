/**
 * Auth routes: register, login and password recovery are public but
 * rate-limited; /me (profile and password change) requires a valid token.
 */
import { Router } from "express";
import {
  changePassword,
  forgotPassword,
  getMe,
  login,
  register,
  resetPassword,
  updateProfile,
} from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";
import { authLimiter, forgotPasswordLimiter, resetPasswordLimiter } from "../middleware/rateLimiter.js";
import validate from "../middleware/validate.js";
import {
  changePasswordRules,
  forgotPasswordRules,
  loginRules,
  registerRules,
  resetPasswordRules,
  updateProfileRules,
} from "../validators/authValidators.js";

const router = Router();

router.post("/register", authLimiter, validate(registerRules), register);
router.post("/login", authLimiter, validate(loginRules), login);
router.post("/forgot-password", forgotPasswordLimiter, validate(forgotPasswordRules), forgotPassword);
router.post("/reset-password", resetPasswordLimiter, validate(resetPasswordRules), resetPassword);

router.route("/me").get(protect, getMe).patch(protect, validate(updateProfileRules), updateProfile);
router.patch("/me/password", protect, validate(changePasswordRules), changePassword);

export default router;
