import { body } from "express-validator";
import { MAX_PO_ITEMS } from "../utils/constants.js";
import { idParamRules } from "./common.js";

/** POST /api/purchase-orders */
export const createPurchaseOrderRules = [
  body("supplier").notEmpty().withMessage("Supplier is required").isMongoId().withMessage("Invalid supplier"),
  body("items").isArray({ min: 1, max: MAX_PO_ITEMS }).withMessage(`Add between 1 and ${MAX_PO_ITEMS} items`),
  body("items.*.product").notEmpty().withMessage("Product is required").isMongoId().withMessage("Invalid product"),
  body("items.*.quantity")
    .isInt({ min: 1, max: 1_000_000 })
    .withMessage("Quantity must be a whole number of at least 1")
    .toInt(),
  body("items.*.unitCost")
    .isFloat({ min: 0, max: 10_000_000 })
    .withMessage("Unit cost must be a number from 0 to 10,000,000")
    .toFloat(),
  body("notes")
    .optional({ values: "null" })
    .trim()
    .isLength({ max: 500 })
    .withMessage("Notes must be at most 500 characters"),
];

/** Optional timeline note for approve / receive. */
export const noteRules = [
  ...idParamRules,
  body("note")
    .optional({ values: "null" })
    .trim()
    .isLength({ max: 300 })
    .withMessage("Note must be at most 300 characters"),
];

/** PATCH /:id/reject: the reason is required so the requester knows why. */
export const rejectRules = [
  ...idParamRules,
  body("reason")
    .trim()
    .notEmpty()
    .withMessage("Please give a reason for rejecting")
    .isLength({ max: 300 })
    .withMessage("Reason must be at most 300 characters"),
];

/** PATCH /:id/cancel: the reason is optional. */
export const cancelRules = [
  ...idParamRules,
  body("reason")
    .optional({ values: "null" })
    .trim()
    .isLength({ max: 300 })
    .withMessage("Reason must be at most 300 characters"),
];
