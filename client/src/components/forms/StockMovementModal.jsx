import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { recordMovement } from "../../api/stock";
import useForm from "../../hooks/useForm";
import { IN_REASONS, OUT_REASONS } from "../../utils/constants";
import { getFieldErrors } from "../../utils/errors";
import { formatNumber } from "../../utils/formatters";
import { validateMovement } from "../../utils/validators";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Modal from "../ui/Modal";
import Select from "../ui/Select";
import Textarea from "../ui/Textarea";
import ProductPicker, { CurrentStock } from "./ProductPicker";

const TYPES = [
  { value: "IN", label: "Stock in", icon: ArrowDownToLine, active: "bg-emerald-600 text-white" },
  { value: "OUT", label: "Stock out", icon: ArrowUpFromLine, active: "bg-red-600 text-white" },
];

/**
 * Records a stock IN or OUT movement.
 *
 * Used in three places: the Stock Movements page (free product picker), the
 * Product Details page (product fixed) and the dashboard "Restock" action
 * (product fixed, type IN). Insufficient stock is checked by the API, and its
 * 409 message is shown inline under the quantity field.
 *
 * @param {{
 *   open: boolean, onClose: () => void, onSuccess: (result: { movement: object, product: object }) => void,
 *   product?: { _id: string, name: string, sku: string, quantity: number, unit: string } | null,
 *   defaultType?: "IN"|"OUT"
 * }} props
 */
export default function StockMovementModal({ open, onClose, onSuccess, product = null, defaultType = "IN" }) {
  const { values, errors, setErrors, setField, handleChange, reset } = useForm({});
  const [saving, setSaving] = useState(false);

  // Depend on the id, not the object: the parent may refetch and pass a new
  // object for the same product while the modal is open, which must not wipe
  // what the user typed (or the error message being shown).
  const fixedProductId = product?._id ?? "";

  // Reset the form whenever the modal opens.
  useEffect(() => {
    if (!open) return;
    reset({
      type: defaultType,
      productId: fixedProductId,
      quantity: "",
      reason: (defaultType === "IN" ? IN_REASONS : OUT_REASONS)[0],
      note: "",
    });
  }, [open, fixedProductId, defaultType, reset]);

  const reasons = values.type === "OUT" ? OUT_REASONS : IN_REASONS;

  const changeType = (type) => {
    setField("type", type);
    setField("reason", (type === "IN" ? IN_REASONS : OUT_REASONS)[0]);
    setErrors({});
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationErrors = validateMovement(values);
    if (Object.keys(validationErrors).length) return setErrors(validationErrors);

    setSaving(true);
    try {
      const body = await recordMovement(values.type, {
        productId: values.productId,
        quantity: Number(values.quantity),
        reason: values.reason,
        note: values.note.trim(),
      });
      const { product: updated } = body.data;
      toast.success(
        `${values.type === "IN" ? "Added" : "Removed"} ${values.quantity} ${updated.unit}. ${updated.name} now has ${formatNumber(updated.quantity)}.`
      );
      onSuccess(body.data);
    } catch (error) {
      setErrors(getFieldErrors(error));
    } finally {
      setSaving(false);
    }
  };

  const isIn = values.type === "IN";

  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!saving}
      title="Record stock movement"
      description={product ? `${product.name} · ${product.sku}` : "Add or remove stock for a product."}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="movement-form" variant={isIn ? "success" : "danger"} loading={saving}>
            {isIn ? "Record stock in" : "Record stock out"}
          </Button>
        </>
      }
    >
      <form id="movement-form" onSubmit={handleSubmit} noValidate className="space-y-4">
        <fieldset>
          <legend className="mb-1.5 block text-sm font-medium text-slate-700">Movement type</legend>
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
            {TYPES.map(({ value, label, icon: Icon, active }) => (
              <button
                key={value}
                type="button"
                onClick={() => changeType(value)}
                aria-pressed={values.type === value}
                className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${
                  values.type === value ? `${active} shadow-sm` : "text-slate-600 hover:bg-white"
                }`}
              >
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        {product ? (
          <CurrentStock product={product} />
        ) : (
          <ProductPicker value={values.productId ?? ""} onChange={handleChange} error={errors.productId} />
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Quantity"
            name="quantity"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={values.quantity ?? ""}
            onChange={handleChange}
            error={errors.quantity}
            placeholder="0"
            required
          />
          <Select
            label="Reason"
            name="reason"
            value={values.reason ?? ""}
            onChange={handleChange}
            error={errors.reason}
            options={reasons.map((reason) => ({ value: reason, label: reason }))}
            required
          />
        </div>

        <Textarea
          label="Note"
          name="note"
          value={values.note ?? ""}
          onChange={handleChange}
          error={errors.note}
          placeholder="Optional, e.g. PO number or customer name"
          maxLength={300}
          rows={2}
        />
      </form>
    </Modal>
  );
}
