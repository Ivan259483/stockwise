import { body } from "express-validator";
import { IN_REASONS, OUT_REASONS } from "../utils/constants.js";

/**
 * Builds the rules for POST /api/stock/in or /api/stock/out.
 * Reasons are limited per direction, e.g. "Sale" is not a valid stock-in reason.
 *
 * @param {"IN"|"OUT"} type
 */
const movementRules = (type) => {
  const reasons = type === "IN" ? IN_REASONS : OUT_REASONS;
  return [
    body("productId").notEmpty().withMessage("Product is required").isMongoId().withMessage("Invalid product"),
    body("quantity")
      .notEmpty()
      .withMessage("Quantity is required")
      .isInt({ min: 1, max: 1_000_000 })
      .withMessage("Quantity must be a whole number of at least 1")
      .toInt(),
    body("reason")
      .notEmpty()
      .withMessage("Reason is required")
      .isIn(reasons)
      .withMessage(`Reason must be one of: ${reasons.join(", ")}`),
    body("note")
      .optional({ values: "null" })
      .trim()
      .isLength({ max: 300 })
      .withMessage("Note must be at most 300 characters"),
  ];
};

export const stockInRules = movementRules("IN");
export const stockOutRules = movementRules("OUT");
