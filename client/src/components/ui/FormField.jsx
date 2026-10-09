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
