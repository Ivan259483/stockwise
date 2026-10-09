import { AlertTriangle } from "lucide-react";
import Button from "./Button";
import Modal from "./Modal";

/**
 * "Are you sure?" dialog for destructive actions such as deletes.
 *
 * @param {{
 *   open: boolean, title: string, message: import("react").ReactNode,
 *   confirmLabel?: string, loading?: boolean,
 *   onConfirm: () => void, onCancel: () => void
 * }} props
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
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
          <Button variant="danger" onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-red-100">
          <AlertTriangle className="size-5 text-red-600" aria-hidden="true" />
        </div>
        <div className="text-sm text-slate-600">{message}</div>
      </div>
    </Modal>
  );
}
