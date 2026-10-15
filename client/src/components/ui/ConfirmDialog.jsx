import { AlertTriangle, CheckCircle2 } from "lucide-react";
import Button from "./Button";
import Modal from "./Modal";

/** Icon and colors per tone: red for destructive actions, green for confirmations. */
const TONES = {
  danger: { icon: AlertTriangle, circle: "bg-red-100", color: "text-red-600", button: "danger" },
  success: { icon: CheckCircle2, circle: "bg-emerald-100", color: "text-emerald-600", button: "success" },
};

/**
 * "Are you sure?" dialog for destructive actions such as deletes (or, with
 * tone="success", for important confirmations such as receiving a delivery).
 *
 * @param {{
 *   open: boolean, title: string, message: import("react").ReactNode,
 *   confirmLabel?: string, loading?: boolean, tone?: keyof typeof TONES,
 *   onConfirm: () => void, onCancel: () => void
 * }} props
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  loading = false,
  tone = "danger",
  onConfirm,
  onCancel,
}) {
  const { icon: Icon, circle, color, button } = TONES[tone];
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
          <Button variant={button} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-3">
        <div className={`flex size-10 shrink-0 items-center justify-center rounded-full ${circle}`}>
          <Icon className={`size-5 ${color}`} aria-hidden="true" />
        </div>
        <div className="text-sm text-slate-600">{message}</div>
      </div>
    </Modal>
  );
}
