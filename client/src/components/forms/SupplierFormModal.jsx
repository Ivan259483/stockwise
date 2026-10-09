import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { createSupplier, updateSupplier } from "../../api/suppliers";
import useForm from "../../hooks/useForm";
import { getFieldErrors } from "../../utils/errors";
import { validateSupplier } from "../../utils/validators";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Modal from "../ui/Modal";
import Textarea from "../ui/Textarea";

const EMPTY = { name: "", contactPerson: "", phone: "", email: "", address: "" };

/**
 * Create or edit a supplier in a modal (admin only).
 * @param {{ open: boolean, supplier?: object|null, onClose: () => void, onSaved: (supplier: object) => void }} props
 */
export default function SupplierFormModal({ open, supplier, onClose, onSaved }) {
  const { values, errors, setErrors, handleChange, reset } = useForm(EMPTY);
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(supplier);

  useEffect(() => {
    if (!open) return;
    reset(supplier ? Object.fromEntries(Object.keys(EMPTY).map((key) => [key, supplier[key] ?? ""])) : EMPTY);
  }, [open, supplier, reset]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationErrors = validateSupplier(values);
    if (Object.keys(validationErrors).length) return setErrors(validationErrors);

    setSaving(true);
    try {
      const payload = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim()]));
      const body = isEdit ? await updateSupplier(supplier._id, payload) : await createSupplier(payload);
      toast.success(isEdit ? "Supplier updated" : "Supplier created");
      onSaved(body.data);
    } catch (error) {
      setErrors(getFieldErrors(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!saving}
      size="lg"
      title={isEdit ? "Edit supplier" : "Add supplier"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="supplier-form" loading={saving}>
            {isEdit ? "Save changes" : "Add supplier"}
          </Button>
        </>
      }
    >
      <form id="supplier-form" onSubmit={handleSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Supplier name"
          name="name"
          value={values.name}
          onChange={handleChange}
          error={errors.name}
          placeholder="e.g. Manila Hardware Trading Co."
          className="sm:col-span-2"
          maxLength={80}
          required
        />
        <Input
          label="Contact person"
          name="contactPerson"
          value={values.contactPerson}
          onChange={handleChange}
          error={errors.contactPerson}
          maxLength={60}
        />
        <Input
          label="Phone"
          name="phone"
          type="tel"
          value={values.phone}
          onChange={handleChange}
          error={errors.phone}
          placeholder="0917 123 4567"
        />
        <Input
          label="Email"
          name="email"
          type="email"
          value={values.email}
          onChange={handleChange}
          error={errors.email}
          placeholder="orders@supplier.com"
          className="sm:col-span-2"
        />
        <Textarea
          label="Address"
          name="address"
          value={values.address}
          onChange={handleChange}
          error={errors.address}
          rows={2}
          maxLength={200}
          className="sm:col-span-2"
        />
      </form>
    </Modal>
  );
}
