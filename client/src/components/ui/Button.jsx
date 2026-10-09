import { Link } from "react-router-dom";
import Spinner from "./Spinner";

const VARIANTS = {
  primary: "bg-primary-600 text-white shadow-sm hover:bg-primary-700 focus-visible:outline-primary-600",
  secondary:
    "bg-white text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus-visible:outline-primary-600",
  danger: "bg-red-600 text-white shadow-sm hover:bg-red-700 focus-visible:outline-red-600",
  success: "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 focus-visible:outline-emerald-600",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-primary-600",
};

const SIZES = {
  sm: "gap-1.5 px-2.5 py-1.5 text-xs",
  md: "gap-2 px-3.5 py-2 text-sm",
  icon: "p-2 text-sm",
};

/**
 * Button with variants, a loading state and optional router-link behaviour.
 * While `loading` it is disabled and shows a spinner, preventing double submits.
 *
 * @param {{
 *   variant?: keyof typeof VARIANTS, size?: keyof typeof SIZES, loading?: boolean,
 *   icon?: import("react").ComponentType<{ className?: string }>, to?: string,
 *   className?: string, children?: import("react").ReactNode
 * } & import("react").ButtonHTMLAttributes<HTMLButtonElement>} props
 */
export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon: Icon,
  to,
  className = "",
  children,
  disabled,
  type = "button",
  ...rest
}) {
  const classes = `inline-flex items-center justify-center rounded-lg font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${SIZES[size]} ${className}`;
  const content = (
    <>
      {loading ? (
        <Spinner size="sm" label="Please wait" />
      ) : (
        Icon && <Icon className="size-4 shrink-0" aria-hidden="true" />
      )}
      {children}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {content}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {content}
    </button>
  );
}
