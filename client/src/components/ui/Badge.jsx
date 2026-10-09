import { STOCK_STATUS } from "../../utils/constants";

const TONES = {
  success: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  warning: "bg-amber-50 text-amber-800 ring-amber-600/30",
  danger: "bg-red-50 text-red-700 ring-red-600/20",
  primary: "bg-primary-50 text-primary-700 ring-primary-600/20",
  neutral: "bg-slate-100 text-slate-700 ring-slate-500/20",
};

/**
 * Small pill label.
 * @param {{ tone?: keyof typeof TONES, children: import("react").ReactNode, className?: string }} props
 */
export default function Badge({ tone = "neutral", children, className = "" }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/** Green / amber / red badge for a product's `stockStatus`. */
export function StockStatusBadge({ status }) {
  const config = STOCK_STATUS[status] ?? { label: status, tone: "neutral" };
  return <Badge tone={config.tone}>{config.label}</Badge>;
}

/** IN (green) / OUT (red) badge for stock movements. */
export function MovementTypeBadge({ type }) {
  return <Badge tone={type === "IN" ? "success" : "danger"}>{type === "IN" ? "Stock in" : "Stock out"}</Badge>;
}
