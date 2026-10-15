/**
 * Purchase order routes. Any signed-in user can view, request, cancel their
 * own request and mark an approved PO as received (staff receive deliveries);
 * approving and rejecting are admin-only.
 */
import { Router } from "express";
import {
  approvePurchaseOrder,
  cancelPurchaseOrder,
  createPurchaseOrder,
  getPurchaseOrder,
  getPurchaseOrders,
  receivePurchaseOrder,
  rejectPurchaseOrder,
} from "../controllers/purchaseOrderController.js";
import { archiveRecord, restoreRecord } from "../controllers/archiveController.js";
import { authorize, protect } from "../middleware/auth.js";
import validate from "../middleware/validate.js";
import { archiveRules, idParamRules } from "../validators/common.js";
import {
  cancelRules,
  createPurchaseOrderRules,
  noteRules,
  rejectRules,
} from "../validators/purchaseOrderValidators.js";

const router = Router();

router.use(protect);

router.route("/").get(getPurchaseOrders).post(validate(createPurchaseOrderRules), createPurchaseOrder);
router.get("/:id", validate(idParamRules), getPurchaseOrder);
router.patch("/:id/approve", authorize("admin"), validate(noteRules), approvePurchaseOrder);
router.patch("/:id/reject", authorize("admin"), validate(rejectRules), rejectPurchaseOrder);
router.patch("/:id/cancel", validate(cancelRules), cancelPurchaseOrder);
router.patch("/:id/receive", validate(noteRules), receivePurchaseOrder);
// Only closed POs (Received, Rejected, Cancelled) can be archived.
router.patch("/:id/archive", authorize("admin"), validate(archiveRules), archiveRecord("purchase-orders"));
router.patch("/:id/restore", authorize("admin"), validate(idParamRules), restoreRecord("purchase-orders"));

export default router;
