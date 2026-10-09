import { validationResult } from "express-validator";
import ApiError from "../utils/ApiError.js";

/**
 * Runs a list of express-validator chains and stops with a 400 if any fail.
 *
 * Routes call `validate(rules)` instead of repeating the "check the result and
 * format the errors" boilerplate in each controller. Only the first error per
 * field is reported, which is what the form needs to show inline.
 *
 * @param {import("express-validator").ValidationChain[]} rules
 * @returns {import("express").RequestHandler}
 */
const validate = (rules) => async (req, _res, next) => {
  await Promise.all(rules.map((rule) => rule.run(req)));

  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const errors = result.array({ onlyFirstError: true }).map((error) => ({ field: error.path, message: error.msg }));

  next(ApiError.badRequest(errors[0]?.message ?? "Validation failed", errors));
};

export default validate;
