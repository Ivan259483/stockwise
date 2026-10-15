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

/** Max size of an uploaded product image (the decoded file, not the base64 text). */
export const MAX_IMAGE_BYTES = 1024 * 1024;

/**
 * Business timezone. The Philippines has no daylight saving time, so a fixed
 * offset is safe for building day boundaries (e.g. "from 2026-10-01").
 */
export const APP_TIMEZONE = "Asia/Manila";
export const APP_UTC_OFFSET = "+08:00";

/** The sample client organization the system is configured for (shown in emails and the UI). */
export const STORE_NAME = "Santos Family Hardware";

/**
 * Made-up domain used by the demo accounts (checked with nslookup: NXDOMAIN).
 * Email to this domain is never sent; see services/mailer.js.
 */
export const DEMO_EMAIL_DOMAIN = "santosfamilyhw-demo.com";

/** Password recovery: a 6-digit code that expires after 15 minutes. */
export const RESET_CODE_TTL_MINUTES = 15;
/** Wrong guesses allowed for one code before it is invalidated. */
export const RESET_CODE_MAX_ATTEMPTS = 5;
/** Minimum time between two codes for the same account (extra requests are ignored silently). */
export const RESET_CODE_COOLDOWN_SECONDS = 60;

/**
 * Purchase order workflow:
 * Requested → Approved → Received (completed), or Requested → Rejected / Cancelled.
 */
export const PO_STATUSES = Object.freeze(["Requested", "Approved", "Rejected", "Received", "Cancelled"]);
/** POs that are still in progress (they block archiving their products and supplier). */
export const OPEN_PO_STATUSES = Object.freeze(["Requested", "Approved"]);
/** POs that are finished and may be archived. */
export const CLOSED_PO_STATUSES = Object.freeze(["Received", "Rejected", "Cancelled"]);
/** Events shown on a PO's timeline. */
export const PO_EVENTS = Object.freeze([...PO_STATUSES, "Archived", "Restored"]);
/** Max line items on one purchase order. */
export const MAX_PO_ITEMS = 50;
