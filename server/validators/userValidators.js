import { body } from "express-validator";
import { ROLES } from "../utils/constants.js";
import { emailRule, nameRule, passwordRule } from "./authValidators.js";
import { idParamRules } from "./common.js";

const roleRule = () =>
  body("role")
    .isIn(ROLES)
    .withMessage(`Role must be one of: ${ROLES.join(", ")}`);

/** POST /api/users: name, email, temporary password and role are all required. */
export const createUserRules = [nameRule(), emailRule(), passwordRule(), roleRule()];

/** PATCH /api/users/:id: any of name, email, role and active status. */
export const updateUserRules = [
  ...idParamRules,
  nameRule().optional(),
  emailRule().optional(),
  roleRule().optional(),
  body("isActive").optional().isBoolean({ strict: true }).withMessage("isActive must be true or false"),
  body().custom((value) => {
    if (["name", "email", "role", "isActive"].every((key) => value?.[key] === undefined)) {
      throw new Error("Provide a name, email, role or isActive value to update");
    }
    return true;
  }),
];
