import { Router } from "express";
import { archiveRecord, restoreRecord } from "../controllers/archiveController.js";
import { createUser, getUsers, updateUser } from "../controllers/userController.js";
import { authorize, protect } from "../middleware/auth.js";
import validate from "../middleware/validate.js";
import { archiveRules, idParamRules } from "../validators/common.js";
import { createUserRules, updateUserRules } from "../validators/userValidators.js";

const router = Router();

// User management is admin-only. Users are archived (cannot log in), never deleted.
router.use(protect, authorize("admin"));

router.route("/").get(getUsers).post(validate(createUserRules), createUser);
router.patch("/:id", validate(updateUserRules), updateUser);
router.patch("/:id/archive", validate(archiveRules), archiveRecord("users"));
router.patch("/:id/restore", validate(idParamRules), restoreRecord("users"));

export default router;
