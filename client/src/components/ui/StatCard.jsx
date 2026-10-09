import { Link } from "react-router-dom";

const TONES = {
  primary: "bg-primary-50 text-primary-600",
  success: "bg-emerald-50 text-emerald-600",
  warning: "bg-amber-50 text-amber-600",
  danger: "bg-red-50 text-red-600",
};

/**
 * Dashboard metric tile. If `to` is given the whole card links to a filtered list.
 *
 * @param {{
 *   label: string, value: import("react").ReactNode, hint?: string, to?: string,
 *   icon: import("react").ComponentType<{ className?: string }>, tone?: keyof typeof TONES
 * }} props
 */
export default function StatCard({ label, value, hint, icon: Icon, tone = "primary", to }) {
  const body = (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="mt-1 truncate text-2xl font-bold tracking-tight text-slate-900">{value}</p>
        {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      </div>
      <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${TONES[tone]}`}>
        <Icon className="size-5" aria-hidden="true" />
      </div>
    </div>
  );

  const classes = "block rounded-xl border border-slate-200 bg-white p-5 shadow-sm";
  return to ? (
    <Link to={to} className={`${classes} transition hover:border-primary-300 hover:shadow-md`}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  );
}
