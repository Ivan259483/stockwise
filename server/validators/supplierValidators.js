import { body } from "express-validator";
import { idParamRules } from "./common.js";

const supplierBodyRules = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Supplier name is required")
    .isLength({ max: 80 })
    .withMessage("Supplier name must be at most 80 characters"),
  body("contactPerson")
    .optional({ values: "null" })
    .trim()
    .isLength({ max: 60 })
    .withMessage("Contact person must be at most 60 characters"),
  body("phone")
    .optional({ values: "falsy" })
    .trim()
    // Accepts PH formats like 0917 123 4567, +63 917-123-4567 and (02) 8123-4567.
    .matches(/^[0-9+()\-\s]{7,20}$/)
    .withMessage("Please enter a valid phone number"),
  body("email")
    .optional({ values: "falsy" })
    .trim()
    .isEmail()
    .withMessage("Please enter a valid email address")
    .toLowerCase(),
  body("address")
    .optional({ values: "null" })
    .trim()
    .isLength({ max: 200 })
    .withMessage("Address must be at most 200 characters"),
];

/** POST /api/suppliers */
export const createSupplierRules = supplierBodyRules;

/** PUT /api/suppliers/:id */
export const updateSupplierRules = [...idParamRules, ...supplierBodyRules];
