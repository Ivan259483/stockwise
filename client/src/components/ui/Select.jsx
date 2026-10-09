import { useId } from "react";
import FormField from "./FormField";
import { controlClasses, describedBy } from "./formControl";

/**
 * Labelled native select (native for good mobile UX and accessibility).
 * @param {{
 *   label?: string, error?: string, hint?: string, className?: string,
 *   options: Array<{ value: string, label: string }>, placeholder?: string
 * } & import("react").SelectHTMLAttributes<HTMLSelectElement>} props
 */
export default function Select({ label, error, hint, options, placeholder, className = "", id, required, ...rest }) {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  return (
    <FormField id={selectId} label={label} error={error} hint={hint} required={required} className={className}>
      <select
        id={selectId}
        required={required}
        className={`${controlClasses(error)} pr-8`}
        {...describedBy(selectId, error, hint)}
        {...rest}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FormField>
  );
}
