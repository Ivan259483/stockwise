import { Router } from "express";
import { deleteUser, getUsers, updateUser } from "../controllers/userController.js";
import { authorize, protect } from "../middleware/auth.js";
import validate from "../middleware/validate.js";
import { idParamRules } from "../validators/common.js";
import { updateUserRules } from "../validators/userValidators.js";

const router = Router();

// User management is admin-only.
router.use(protect, authorize("admin"));

router.get("/", getUsers);
router.patch("/:id", validate(updateUserRules), updateUser);
router.delete("/:id", validate(idParamRules), deleteUser);

export default router;
