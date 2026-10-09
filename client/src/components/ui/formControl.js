/** Shared styling and aria helpers for Input, Select and Textarea. */

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
