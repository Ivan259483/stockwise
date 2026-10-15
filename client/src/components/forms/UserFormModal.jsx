import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { createUser, updateUser } from "../../api/users";
import useForm from "../../hooks/useForm";
import { ROLE_OPTIONS } from "../../utils/constants";
import { getFieldErrors } from "../../utils/errors";
import { validateUserForm } from "../../utils/validators";
import Button from "../ui/Button";
import Input from "../ui/Input";
import Modal from "../ui/Modal";
import Select from "../ui/Select";

const EMPTY = { name: "", email: "", role: "staff", password: "" };

/**
 * Admin form to add a user (with a temporary password) or edit a user's name,
 * email and role. The admin's own role cannot be changed (the API agrees).
 *
 * @param {{ open: boolean, user?: object|null, isSelf?: boolean, onClose: () => void, onSaved: (user: object) => void }} props
 */
export default function UserFormModal({ open, user, isSelf = false, onClose, onSaved }) {
  const { values, errors, setErrors, handleChange, reset } = useForm(EMPTY);
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(user);

  useEffect(() => {
    if (!open) return;
    reset(user ? { name: user.name, email: user.email, role: user.role, password: "" } : EMPTY);
  }, [open, user, reset]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationErrors = validateUserForm(values, { isEdit });
    if (Object.keys(validationErrors).length) return setErrors(validationErrors);

    setSaving(true);
    try {
      const payload = { name: values.name.trim(), email: values.email.trim().toLowerCase(), role: values.role };
      const body = isEdit
        ? await updateUser(user._id, isSelf ? { name: payload.name, email: payload.email } : payload)
        : await createUser({ ...payload, password: values.password });
      toast.success(isEdit ? `${body.data.name} was updated` : `${body.data.name} can now sign in`);
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
      title={isEdit ? "Edit user" : "Add user"}
      description={isEdit ? user.email : "Create an account and share the temporary password with the person."}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="user-form" loading={saving}>
            {isEdit ? "Save changes" : "Add user"}
          </Button>
        </>
      }
    >
      <form id="user-form" onSubmit={handleSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Full name"
          name="name"
          value={values.name}
          onChange={handleChange}
          error={errors.name}
          placeholder="e.g. Juan Dela Cruz"
          maxLength={60}
          className="sm:col-span-2"
          required
        />
        <Input
          label="Email"
          name="email"
          type="email"
          value={values.email}
          onChange={handleChange}
          error={errors.email}
          className="sm:col-span-2"
          required
        />
        <Select
          label="Role"
          name="role"
          value={values.role}
          onChange={handleChange}
          error={errors.role}
          options={ROLE_OPTIONS}
          disabled={isSelf}
          hint={isSelf ? "You cannot change your own role." : "Admins can manage the catalog, users and approvals."}
          required
        />
        {!isEdit && (
          <Input
            label="Temporary password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={values.password}
            onChange={handleChange}
            error={errors.password}
            hint="8+ characters with a letter and a number. They can change it on their profile."
            required
          />
        )}
      </form>
    </Modal>
  );
}
