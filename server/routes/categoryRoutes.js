import { Router } from "express";
import { createCategory, deleteCategory, getCategories, updateCategory } from "../controllers/categoryController.js";
import { authorize, protect } from "../middleware/auth.js";
import validate from "../middleware/validate.js";
import { createCategoryRules, updateCategoryRules } from "../validators/categoryValidators.js";
import { idParamRules } from "../validators/common.js";

const router = Router();

// Any logged-in user can read; only admins can write.
router.use(protect);

router.route("/").get(getCategories).post(authorize("admin"), validate(createCategoryRules), createCategory);
router
  .route("/:id")
  .put(authorize("admin"), validate(updateCategoryRules), updateCategory)
  .delete(authorize("admin"), validate(idParamRules), deleteCategory);

export default router;
