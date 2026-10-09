import { body } from "express-validator";
import { idParamRules } from "./common.js";

const categoryBodyRules = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Category name is required")
    .isLength({ max: 50 })
    .withMessage("Category name must be at most 50 characters"),
  body("description")
    .optional({ values: "null" })
    .trim()
    .isLength({ max: 300 })
    .withMessage("Description must be at most 300 characters"),
];

/** POST /api/categories */
export const createCategoryRules = categoryBodyRules;

/** PUT /api/categories/:id */
export const updateCategoryRules = [...idParamRules, ...categoryBodyRules];
