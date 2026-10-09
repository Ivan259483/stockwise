/**
 * An operational error with an HTTP status code.
 *
 * Controllers and middleware throw ApiError for expected failures (bad input,
 * missing records, insufficient stock, ...). The central error handler turns it
 * into the standard `{ success: false, message, errors }` response, so no
 * controller has to format error responses itself.
 */
export default class ApiError extends Error {
  /**
   * @param {number} statusCode HTTP status to send.
   * @param {string} message Human-readable message shown to the user.
   * @param {Array<{field: string, message: string}>} [errors] Optional field-level errors.
   */
  constructor(statusCode, message, errors = []) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.errors = errors;
  }

  /** @param {string} message @param {Array<{field: string, message: string}>} [errors] */
  static badRequest(message, errors) {
    return new ApiError(400, message, errors);
  }

  /** @param {string} [message] */
  static unauthorized(message = "Not authorized, please log in") {
    return new ApiError(401, message);
  }

  /** @param {string} [message] */
  static forbidden(message = "You do not have permission to perform this action") {
    return new ApiError(403, message);
  }

  /** @param {string} [message] */
  static notFound(message = "Resource not found") {
    return new ApiError(404, message);
  }

  /** @param {string} message @param {Array<{field: string, message: string}>} [errors] */
  static conflict(message, errors) {
    return new ApiError(409, message, errors);
  }
}
