import { useId } from "react";
import FormField, { controlClasses, describedBy } from "./FormField";

/**
 * Labelled text input with inline error/hint.
 * @param {{ label?: string, error?: string, hint?: string, icon?: import("react").ComponentType<{ className?: string }>, className?: string } & import("react").InputHTMLAttributes<HTMLInputElement>} props
 */
export default function Input({ label, error, hint, icon: Icon, className = "", id, required, ...rest }) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <FormField id={inputId} label={label} error={error} hint={hint} required={required} className={className}>
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        )}
        <input
          id={inputId}
          required={required}
          className={`${controlClasses(error)} ${Icon ? "pl-9" : ""}`}
          {...describedBy(inputId, error, hint)}
          {...rest}
        />
      </div>
    </FormField>
  );
}
