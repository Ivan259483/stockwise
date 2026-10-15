import { useState } from "react";
import Button from "./Button";
import Modal from "./Modal";
import Textarea from "./Textarea";

/**
 * Asks for a short reason before an action (reject, cancel, archive).
 * The reason is required unless `required` is false.
 *
 * @param {{
 *   open: boolean, title: string, message?: import("react").ReactNode, label?: string,
 *   placeholder?: string, required?: boolean, confirmLabel: string,
 *   confirmVariant?: "primary"|"danger"|"success"|"secondary", loading?: boolean,
 *   onConfirm: (reason: string) => void, onCancel: () => void
 * }} props
 */
export default function ReasonDialog({
  open,
  title,
  message,
  label = "Reason",
  placeholder,
  required = true,
  confirmLabel,
  confirmVariant = "danger",
  loading = false,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      dismissible={!loading}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" form="reason-form" variant={confirmVariant} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {/* Mounted only while open, so every opening starts with an empty reason. */}
      <ReasonForm message={message} label={label} placeholder={placeholder} required={required} onConfirm={onConfirm} />
    </Modal>
  );
}

/** The form inside the dialog (submitted by the footer button through form="reason-form"). */
function ReasonForm({ message, label, placeholder, required, onConfirm }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const submit = (event) => {
    event.preventDefault();
    if (required && !reason.trim()) return setError(`${label} is required`);
    onConfirm(reason.trim());
  };

  return (
    <form id="reason-form" onSubmit={submit} noValidate className="space-y-3">
      {message && <div className="text-sm text-slate-600">{message}</div>}
      <Textarea
        label={required ? label : `${label} (optional)`}
        name="reason"
        value={reason}
        onChange={(event) => {
          setReason(event.target.value);
          setError("");
        }}
        error={error}
        placeholder={placeholder}
        maxLength={300}
        rows={3}
        required={required}
      />
    </form>
  );
}
