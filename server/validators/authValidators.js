import { body } from "express-validator";

/** POST /api/auth/register */
export const registerRules = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ max: 60 })
    .withMessage("Name must be at most 60 characters"),
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please enter a valid email address")
    .toLowerCase(),
  body("password")
    .isLength({ min: 8, max: 128 })
    .withMessage("Password must be 8 to 128 characters")
    .matches(/[A-Za-z]/)
    .withMessage("Password must contain at least one letter")
    .matches(/\d/)
    .withMessage("Password must contain at least one number"),
];

/** POST /api/auth/login */
export const loginRules = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please enter a valid email address")
    .toLowerCase(),
  body("password").notEmpty().withMessage("Password is required"),
];
