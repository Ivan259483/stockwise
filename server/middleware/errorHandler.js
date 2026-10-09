import ApiError from "../utils/ApiError.js";

/** User-facing messages for unique-index violations, keyed by field. */
const DUPLICATE_MESSAGES = {
  sku: "SKU already exists",
  email: "Email already exists",
  name: "Category name already exists",
};

/**
 * Converts any thrown error into an ApiError so every failure produces the
 * same `{ success: false, message, errors }` shape.
 *
 * @param {any} err
 * @returns {ApiError}
 */
const normalizeError = (err) => {
  if (err instanceof ApiError) return err;

  // Mongoose schema validation (required, min, enum, match, ...).
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    return ApiError.badRequest(errors[0]?.message ?? "Validation failed", errors);
  }

  // A malformed ObjectId or a value that cannot be cast to the schema type.
  if (err.name === "CastError") {
    return err.kind === "ObjectId"
      ? ApiError.badRequest("Invalid ID", [{ field: err.path, message: "Invalid ID" }])
      : ApiError.badRequest(`Invalid value for ${err.path}`, [{ field: err.path, message: "Invalid value" }]);
  }

  // Unique index violation (duplicate SKU, email or category name).
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue ?? err.keyPattern ?? {})[0] ?? "field";
    const message = DUPLICATE_MESSAGES[field] ?? `${field} already exists`;
    return ApiError.conflict(message, [{ field, message }]);
  }

  if (err.name === "TokenExpiredError") return ApiError.unauthorized("Session expired, please log in again");
  if (err.name === "JsonWebTokenError") return ApiError.unauthorized("Invalid token, please log in again");

  // Errors raised by express.json() for bad or oversized bodies.
  if (err.type === "entity.parse.failed") return ApiError.badRequest("Malformed JSON in request body");
  if (err.type === "entity.too.large") return new ApiError(413, "Request body is too large");

  return null;
};

/**
 * Central Express error handler (must have 4 arguments).
 * Unknown errors become a generic 500; details are logged server-side only so
 * stack traces and internals never leak to the client.
 */
const errorHandler = (err, req, res, _next) => {
  const apiError = normalizeError(err);

  if (!apiError) {
    console.error(`[error] ${req.method} ${req.originalUrl}`, err);
    return res.status(500).json({
      success: false,
      message: "Something went wrong on our end. Please try again later.",
      errors: [],
    });
  }

  res.status(apiError.statusCode).json({
    success: false,
    message: apiError.message,
    errors: apiError.errors ?? [],
  });
};

export default errorHandler;
