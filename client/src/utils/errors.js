/** Helpers for reading the API's `{ success: false, message, errors }` error shape. */

/**
 * Best human-readable message for any axios/network error.
 * @param {unknown} error
 * @returns {string}
 */
export const getErrorMessage = (error) => {
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.code === "ECONNABORTED") return "The server took too long to respond. Please try again.";
  if (error?.request && !error?.response) return "Cannot reach the server. Check your connection and try again.";
  return error?.message || "Something went wrong. Please try again.";
};

/**
 * Converts the API's `errors: [{ field, message }]` into `{ [field]: message }`
 * so forms can show server-side errors next to the right input.
 *
 * @param {unknown} error
 * @returns {Record<string, string>}
 */
export const getFieldErrors = (error) =>
  Object.fromEntries((error?.response?.data?.errors ?? []).map(({ field, message }) => [field, message]));
