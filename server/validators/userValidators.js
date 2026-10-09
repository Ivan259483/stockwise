import { body } from "express-validator";
import { ROLES } from "../utils/constants.js";
import { idParamRules } from "./common.js";

/** PATCH /api/users/:id: only role and active status can be changed by an admin. */
export const updateUserRules = [
  ...idParamRules,
  body("role").optional().isIn(ROLES).withMessage(`Role must be one of: ${ROLES.join(", ")}`),
  body("isActive").optional().isBoolean({ strict: true }).withMessage("isActive must be true or false"),
  body().custom((value) => {
    if (value?.role === undefined && value?.isActive === undefined) {
      throw new Error("Provide a role or isActive value to update");
    }
    return true;
  }),
];
