import { useId } from "react";
import FormField from "./FormField";
import { controlClasses, describedBy } from "./formControl";

/**
 * Labelled multi-line text input.
 * @param {{ label?: string, error?: string, hint?: string, className?: string } & import("react").TextareaHTMLAttributes<HTMLTextAreaElement>} props
 */
export default function Textarea({ label, error, hint, className = "", id, required, rows = 3, ...rest }) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;

  return (
    <FormField id={textareaId} label={label} error={error} hint={hint} required={required} className={className}>
      <textarea
        id={textareaId}
        rows={rows}
        required={required}
        className={`${controlClasses(error)} resize-y`}
        {...describedBy(textareaId, error, hint)}
        {...rest}
      />
    </FormField>
  );
}
