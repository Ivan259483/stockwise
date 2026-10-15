import { Router } from "express";
import { archiveRecord, restoreRecord } from "../controllers/archiveController.js";
import { createSupplier, getSuppliers, updateSupplier } from "../controllers/supplierController.js";
import { authorize, protect } from "../middleware/auth.js";
import validate from "../middleware/validate.js";
import { archiveRules, idParamRules } from "../validators/common.js";
import { createSupplierRules, updateSupplierRules } from "../validators/supplierValidators.js";

const router = Router();

// Any logged-in user can read; only admins can write. Suppliers are archived, never deleted.
router.use(protect);

router.route("/").get(getSuppliers).post(authorize("admin"), validate(createSupplierRules), createSupplier);
router.put("/:id", authorize("admin"), validate(updateSupplierRules), updateSupplier);
router.patch("/:id/archive", authorize("admin"), validate(archiveRules), archiveRecord("suppliers"));
router.patch("/:id/restore", authorize("admin"), validate(idParamRules), restoreRecord("suppliers"));

export default router;
