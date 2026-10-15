import { body } from "express-validator";

/** Name rule shared by registration, the profile page and admin user forms. */
export const nameRule = () =>
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ max: 60 })
    .withMessage("Name must be at most 60 characters");

/** Email rule shared by every form that takes an email. */
export const emailRule = (field = "email") =>
  body(field)
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please enter a valid email address")
    .toLowerCase();

/** Password strength rule shared by registration, password change/reset and admin user creation. */
export const passwordRule = (field = "password") =>
  body(field)
    .isLength({ min: 8, max: 128 })
    .withMessage("Password must be 8 to 128 characters")
    .matches(/[A-Za-z]/)
    .withMessage("Password must contain at least one letter")
    .matches(/\d/)
    .withMessage("Password must contain at least one number");

/** POST /api/auth/register */
export const registerRules = [nameRule(), emailRule(), passwordRule()];

/** POST /api/auth/login */
export const loginRules = [emailRule(), body("password").notEmpty().withMessage("Password is required")];

/** PATCH /api/auth/me: name and/or email. */
export const updateProfileRules = [
  nameRule().optional(),
  emailRule().optional(),
  body().custom((value) => {
    if (value?.name === undefined && value?.email === undefined) throw new Error("Provide a name or email to update");
    return true;
  }),
];

/** PATCH /api/auth/me/password */
export const changePasswordRules = [
  body("currentPassword").notEmpty().withMessage("Current password is required"),
  passwordRule("newPassword"),
];

/** POST /api/auth/forgot-password */
export const forgotPasswordRules = [emailRule()];

/** POST /api/auth/reset-password */
export const resetPasswordRules = [
  emailRule(),
  body("code")
    .trim()
    .matches(/^\d{6}$/)
    .withMessage("Enter the 6-digit code from the email"),
  passwordRule(),
];
