/**
 * Label + control + hint/error wrapper shared by Input, Select and Textarea so
 * every form control is labelled and announces its error to screen readers.
 *
 * @param {{ id: string, label?: string, error?: string, hint?: string, required?: boolean, className?: string, children: import("react").ReactNode }} props
 */
export default function FormField({ id, label, error, hint, required, className = "", children }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
          {required && (
            <span className="ml-0.5 text-red-500" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-xs font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="mt-1.5 text-xs text-slate-500">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

/** Tailwind classes for text-like controls, with a red ring when invalid. */
export const controlClasses = (hasError) =>
  `block w-full rounded-lg border-0 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm ring-1 ring-inset placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 ${
    hasError ? "ring-red-400 focus:ring-red-500" : "ring-slate-300 focus:ring-primary-600"
  }`;

/** aria attributes that connect a control to its error or hint text. */
export const describedBy = (id, error, hint) => ({
  "aria-invalid": error ? true : undefined,
  "aria-describedby": error ? `${id}-error` : hint ? `${id}-hint` : undefined,
});
