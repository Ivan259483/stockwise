/** Auth routes: register and login are public but rate-limited; /me requires a valid token. */
import { Router } from "express";
import { getMe, login, register } from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";
import { authLimiter } from "../middleware/rateLimiter.js";
import validate from "../middleware/validate.js";
import { loginRules, registerRules } from "../validators/authValidators.js";

const router = Router();

router.post("/register", authLimiter, validate(registerRules), register);
router.post("/login", authLimiter, validate(loginRules), login);
router.get("/me", protect, getMe);

export default router;
