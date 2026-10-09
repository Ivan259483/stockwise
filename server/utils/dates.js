import { APP_TIMEZONE, APP_UTC_OFFSET } from "./constants.js";

export const DAY_MS = 24 * 60 * 60 * 1000;

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Formats a date as YYYY-MM-DD in the business timezone (Asia/Manila).
 * @param {Date} date
 * @returns {string}
 */
export const toLocalDateString = (date) => date.toLocaleDateString("en-CA", { timeZone: APP_TIMEZONE });

/**
 * Parses a `from`/`to` query value. A plain YYYY-MM-DD is read as the start
 * (or end) of that day in Manila time so filters match what the user sees.
 *
 * @param {string} value
 * @param {"start"|"end"} edge
 * @returns {Date|null} null when the value is not a valid date.
 */
export const parseDateBoundary = (value, edge) => {
  const text = String(value).trim();
  const date = DATE_ONLY.test(text)
    ? new Date(`${text}T${edge === "start" ? "00:00:00.000" : "23:59:59.999"}${APP_UTC_OFFSET}`)
    : new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * Midnight (Manila time) `daysAgo` days before today.
 * @param {number} daysAgo
 * @returns {Date}
 */
export const startOfLocalDay = (daysAgo = 0) => {
  const today = parseDateBoundary(toLocalDateString(new Date()), "start");
  return new Date(today.getTime() - daysAgo * DAY_MS);
};
