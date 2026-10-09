/** Display formatters (Philippine locale and peso currency). */

const LOCALE = "en-PH";

const currencyFormatter = new Intl.NumberFormat(LOCALE, { style: "currency", currency: "PHP" });
const wholeCurrencyFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});
const compactCurrencyFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "PHP",
  notation: "compact",
  maximumFractionDigits: 1,
});
const numberFormatter = new Intl.NumberFormat(LOCALE);
const dateFormatter = new Intl.DateTimeFormat(LOCALE, { dateStyle: "medium" });
const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, { dateStyle: "medium", timeStyle: "short" });
const shortDayFormatter = new Intl.DateTimeFormat(LOCALE, { month: "short", day: "numeric" });

/** 1234.5 → "₱1,234.50" */
export const formatCurrency = (value) => currencyFormatter.format(Number(value) || 0);

/** 110018.4 → "₱110,018" (headline numbers where centavos add noise) */
export const formatWholeCurrency = (value) => wholeCurrencyFormatter.format(Number(value) || 0);

/** 125000 → "₱125K" (chart axes, where space is tight) */
export const formatCompactCurrency = (value) => compactCurrencyFormatter.format(Number(value) || 0);

/** 12345 → "12,345" */
export const formatNumber = (value) => numberFormatter.format(Number(value) || 0);

/** ISO string → "Oct 9, 2026" */
export const formatDate = (value) => (value ? dateFormatter.format(new Date(value)) : "—");

/** ISO string → "Oct 9, 2026, 2:30 PM" */
export const formatDateTime = (value) => (value ? dateTimeFormatter.format(new Date(value)) : "—");

/** "2026-10-09" → "Oct 9". Parsed as local noon so the day never shifts across timezones. */
export const formatShortDay = (yyyyMmDd) => shortDayFormatter.format(new Date(`${yyyyMmDd}T12:00:00`));
