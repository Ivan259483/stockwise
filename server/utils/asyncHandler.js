/**
 * Wraps an async route handler so a rejected promise is forwarded to `next()`.
 *
 * Express 5 already does this for async handlers, but wrapping keeps the
 * intent explicit and makes the controllers safe to reuse with Express 4.
 *
 * @param {(req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => Promise<unknown>} fn
 * @returns {import("express").RequestHandler}
 */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export default asyncHandler;
