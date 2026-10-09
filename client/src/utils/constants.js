/** App-wide constants. Allowed values mirror the API (server/utils/constants.js). */

export const APP_NAME = "StockWise";

export const UNITS = ["pcs", "box", "kg", "L", "pack"];

export const IN_REASONS = ["Purchase", "Return", "Adjustment", "Other"];
export const OUT_REASONS = ["Sale", "Damaged", "Expired", "Adjustment", "Other"];

/** Max product image size accepted by the API (1 MB). */
export const MAX_IMAGE_BYTES = 1024 * 1024;

/** Image formats accepted for product photos (the API accepts the same types). */
export const IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

export const STOCK_STATUS = {
  in_stock: { label: "In stock", tone: "success" },
  low_stock: { label: "Low stock", tone: "warning" },
  out_of_stock: { label: "Out of stock", tone: "danger" },
};

export const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "in_stock", label: "In stock" },
  { value: "low_stock", label: "Low stock" },
  { value: "out_of_stock", label: "Out of stock" },
];

export const SORT_OPTIONS = [
  { value: "name", label: "Name (A–Z)" },
  { value: "-quantity", label: "Quantity (high–low)" },
  { value: "quantity", label: "Quantity (low–high)" },
  { value: "price", label: "Price (low–high)" },
  { value: "-price", label: "Price (high–low)" },
  { value: "-createdAt", label: "Newest first" },
];

/**
 * Chart colors. Recharts needs literal color strings, so these mirror the
 * theme tokens in index.css (primary-600, emerald-500, rose-500).
 */
export const CHART_COLORS = {
  primary: "#4f46e5",
  stockIn: "#10b981",
  stockOut: "#f43f5e",
  grid: "#e2e8f0",
  axis: "#64748b",
};
