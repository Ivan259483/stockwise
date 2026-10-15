import { Router } from "express";
import { archiveRecord, restoreRecord } from "../controllers/archiveController.js";
import { createProduct, getProduct, getProducts, updateProduct } from "../controllers/productController.js";
import { authorize, protect } from "../middleware/auth.js";
import validate from "../middleware/validate.js";
import { archiveRules, idParamRules } from "../validators/common.js";
import { createProductRules, updateProductRules } from "../validators/productValidators.js";

const router = Router();

// Any logged-in user can read; only admins can write. Products are archived, never deleted.
router.use(protect);

router.route("/").get(getProducts).post(authorize("admin"), validate(createProductRules), createProduct);
router
  .route("/:id")
  .get(validate(idParamRules), getProduct)
  .put(authorize("admin"), validate(updateProductRules), updateProduct);
router.patch("/:id/archive", authorize("admin"), validate(archiveRules), archiveRecord("products"));
router.patch("/:id/restore", authorize("admin"), validate(idParamRules), restoreRecord("products"));

export default router;
