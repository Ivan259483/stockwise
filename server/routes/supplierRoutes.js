import { Router } from "express";
import { createSupplier, deleteSupplier, getSuppliers, updateSupplier } from "../controllers/supplierController.js";
import { authorize, protect } from "../middleware/auth.js";
import validate from "../middleware/validate.js";
import { idParamRules } from "../validators/common.js";
import { createSupplierRules, updateSupplierRules } from "../validators/supplierValidators.js";

const router = Router();

// Any logged-in user can read; only admins can write.
router.use(protect);

router.route("/").get(getSuppliers).post(authorize("admin"), validate(createSupplierRules), createSupplier);
router
  .route("/:id")
  .put(authorize("admin"), validate(updateSupplierRules), updateSupplier)
  .delete(authorize("admin"), validate(idParamRules), deleteSupplier);

export default router;
