import { Router } from "express";
import {
  createProduct,
  deleteProduct,
  getProduct,
  getProducts,
  updateProduct,
} from "../controllers/productController.js";
import { authorize, protect } from "../middleware/auth.js";
import validate from "../middleware/validate.js";
import { idParamRules } from "../validators/common.js";
import { createProductRules, updateProductRules } from "../validators/productValidators.js";

const router = Router();

// Any logged-in user can read; only admins can write.
router.use(protect);

router.route("/").get(getProducts).post(authorize("admin"), validate(createProductRules), createProduct);
router
  .route("/:id")
  .get(validate(idParamRules), getProduct)
  .put(authorize("admin"), validate(updateProductRules), updateProduct)
  .delete(authorize("admin"), validate(idParamRules), deleteProduct);

export default router;
