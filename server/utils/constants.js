/**
 * Domain constants shared by models, validators and controllers so the
 * allowed values are defined in exactly one place.
 */

export const ROLES = Object.freeze(["admin", "staff"]);

export const UNITS = Object.freeze(["pcs", "box", "kg", "L", "pack"]);

export const MOVEMENT_TYPES = Object.freeze(["IN", "OUT"]);

/** Reasons that make sense when stock is received. */
export const IN_REASONS = Object.freeze(["Purchase", "Return", "Adjustment", "Other"]);

/** Reasons that make sense when stock leaves the store. */
export const OUT_REASONS = Object.freeze(["Sale", "Damaged", "Expired", "Adjustment", "Other"]);

/** Every reason accepted by the StockMovement model. */
export const MOVEMENT_REASONS = Object.freeze([...new Set([...IN_REASONS, ...OUT_REASONS])]);

export const STOCK_STATUSES = Object.freeze(["in_stock", "low_stock", "out_of_stock"]);

/** Max size of an uploaded product image (the decoded file, not the base64 text). */
export const MAX_IMAGE_BYTES = 1024 * 1024;

/**
 * Business timezone. The Philippines has no daylight saving time, so a fixed
 * offset is safe for building day boundaries (e.g. "from 2026-10-01").
 */
export const APP_TIMEZONE = "Asia/Manila";
export const APP_UTC_OFFSET = "+08:00";
