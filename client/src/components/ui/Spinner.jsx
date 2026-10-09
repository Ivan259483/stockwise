const SIZES = { sm: "size-4 border-2", md: "size-6 border-2", lg: "size-10 border-[3px]" };

/**
 * Circular loading indicator.
 * @param {{ size?: "sm"|"md"|"lg", className?: string, label?: string }} props
 */
export default function Spinner({ size = "md", className = "", label = "Loading" }) {
  return (
    <span
      role="status"
      aria-label={label}
      className={`inline-block animate-spin rounded-full border-current border-r-transparent ${SIZES[size]} ${className}`}
    />
  );
}

/** Centered spinner for a page or panel that is still loading. */
export function PageLoader({ label = "Loading…" }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-primary-600">
      <Spinner size="lg" label={label} />
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}
