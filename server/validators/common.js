import { body, param } from "express-validator";

/** Rejects `/:id` values that are not valid MongoDB ObjectIds before any query runs. */
export const idParamRules = [param("id").isMongoId().withMessage("Invalid ID")];

/** PATCH /:id/archive: a reason is required so the Archive page can explain every record. */
export const archiveRules = [
  ...idParamRules,
  body("reason")
    .trim()
    .notEmpty()
    .withMessage("Please give a reason for archiving")
    .isLength({ max: 300 })
    .withMessage("Reason must be at most 300 characters"),
];
