import { param } from "express-validator";

/** Rejects `/:id` values that are not valid MongoDB ObjectIds before any query runs. */
export const idParamRules = [param("id").isMongoId().withMessage("Invalid ID")];
