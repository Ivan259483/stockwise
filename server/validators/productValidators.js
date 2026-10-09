import { body } from "express-validator";
import { isValidImage } from "../models/Product.js";
import { UNITS } from "../utils/constants.js";
import { idParamRules } from "./common.js";

/** Rules shared by create and update. */
const productBodyRules = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Product name is required")
    .isLength({ max: 100 })
    .withMessage("Product name must be at most 100 characters"),
  body("sku")
    .trim()
    .notEmpty()
    .withMessage("SKU is required")
    .toUpperCase()
    .matches(/^[A-Z0-9-]{2,30}$/)
    .withMessage("SKU may only contain letters, numbers and dashes (2-30 characters)"),
  body("category").notEmpty().withMessage("Category is required").isMongoId().withMessage("Invalid category"),
  body("supplier").optional({ values: "falsy" }).isMongoId().withMessage("Invalid supplier"),
  body("description")
    .optional({ values: "null" })
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description must be at most 500 characters"),
  body("unit")
    .optional()
    .isIn(UNITS)
    .withMessage(`Unit must be one of: ${UNITS.join(", ")}`),
  body("costPrice")
    .optional()
    .isFloat({ min: 0, max: 10_000_000 })
    .withMessage("Cost price must be a number from 0 to 10,000,000")
    .toFloat(),
  body("sellingPrice")
    .optional()
    .isFloat({ min: 0, max: 10_000_000 })
    .withMessage("Selling price must be a number from 0 to 10,000,000")
    .toFloat(),
  body("reorderLevel")
    .optional()
    .isInt({ min: 0, max: 1_000_000 })
    .withMessage("Reorder level must be a whole number of 0 or more")
    .toInt(),
  body("image")
    .optional({ values: "falsy" })
    .custom(isValidImage)
    .withMessage("Image must be a URL or an image file of at most 1 MB"),
];

/** POST /api/products: the opening quantity can be set only at creation. */
export const createProductRules = [
  ...productBodyRules,
  body("quantity")
    .optional()
    .isInt({ min: 0, max: 1_000_000 })
    .withMessage("Quantity must be a whole number of 0 or more")
    .toInt(),
];

/** PUT /api/products/:id: quantity is ignored here; use stock in/out instead. */
export const updateProductRules = [...idParamRules, ...productBodyRules];
