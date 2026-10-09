/** Small, framework-agnostic helpers shared by the controllers. */

/** Hard cap on page size so one request cannot pull the whole collection. */
const MAX_LIMIT = 100;

/**
 * Reads `page` and `limit` from a query object and returns safe integers.
 *
 * @param {Record<string, unknown>} query Express `req.query`.
 * @param {number} [defaultLimit=10]
 * @returns {{ page: number, limit: number, skip: number }}
 */
export const getPagination = (query, defaultLimit = 10) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || defaultLimit, 1), MAX_LIMIT);
  return { page, limit, skip: (page - 1) * limit };
};

/**
 * Escapes RegExp special characters so user search text is matched literally
 * (prevents regex injection and errors from input such as "3/4\"").
 *
 * @param {string} text
 * @returns {string}
 */
export const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Builds the paginated response body used by every list endpoint.
 *
 * @param {unknown[]} data Items for the current page.
 * @param {number} total Total matching documents.
 * @param {{ page: number, limit: number }} pagination
 */
export const paginated = (data, total, { page, limit }) => ({
  success: true,
  data,
  page,
  limit,
  total,
  totalPages: Math.max(Math.ceil(total / limit), 1),
});

/**
 * Copies only the listed keys that are present (not undefined) on `source`.
 * Used to whitelist request-body fields so clients cannot set protected
 * fields such as `role` or `quantity` through a generic update.
 *
 * @template T
 * @param {T} source
 * @param {string[]} keys
 * @returns {Partial<T>}
 */
export const pick = (source, keys) =>
  Object.fromEntries(keys.filter((key) => source[key] !== undefined).map((key) => [key, source[key]]));
