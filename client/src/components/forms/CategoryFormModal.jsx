import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { createCategory, updateCategory } from "../../api/categories";
import useForm from "../../hooks/useForm";
import { getFieldErrors } from "../../utils/errors";
import { validateCategory } from "../../utils/validators";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Modal from "../ui/Modal";
import Textarea from "../ui/Textarea";

const EMPTY = { name: "", description: "" };

/**
 * Create or edit a category in a modal (admin only).
 * @param {{ open: boolean, category?: object|null, onClose: () => void, onSaved: (category: object) => void }} props
 */
export default function CategoryFormModal({ open, category, onClose, onSaved }) {
  const { values, errors, setErrors, handleChange, reset } = useForm(EMPTY);
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(category);

  // Load the selected category (or blank values) each time the modal opens.
  useEffect(() => {
    if (open) reset(category ? { name: category.name, description: category.description ?? "" } : EMPTY);
  }, [open, category, reset]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationErrors = validateCategory(values);
    if (Object.keys(validationErrors).length) return setErrors(validationErrors);

    setSaving(true);
    try {
      const payload = { name: values.name.trim(), description: values.description.trim() };
      const body = isEdit ? await updateCategory(category._id, payload) : await createCategory(payload);
      toast.success(isEdit ? "Category updated" : "Category created");
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
      title={isEdit ? "Edit category" : "Add category"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="category-form" loading={saving}>
            {isEdit ? "Save changes" : "Add category"}
          </Button>
        </>
      }
    >
      <form id="category-form" onSubmit={handleSubmit} noValidate className="space-y-4">
        <Input
          label="Name"
          name="name"
          value={values.name}
          onChange={handleChange}
          error={errors.name}
          placeholder="e.g. Hand Tools"
          maxLength={50}
          required
        />
        <Textarea
          label="Description"
          name="description"
          value={values.description}
          onChange={handleChange}
          error={errors.description}
          placeholder="What kind of products belong here?"
          maxLength={300}
        />
      </form>
    </Modal>
  );
}
