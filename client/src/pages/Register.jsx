import { Lock, Mail, User, UserPlus } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import useAuth from "../hooks/useAuth";
import useForm from "../hooks/useForm";
import { getFieldErrors } from "../utils/errors";
import { validateRegister } from "../utils/validators";
import AuthLayout from "../components/layout/AuthLayout";

/** Self-service sign-up. New accounts are always "staff"; an admin can promote them later. */
export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const { values, errors, setErrors, handleChange } = useForm({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationErrors = validateRegister(values);
    if (Object.keys(validationErrors).length) return setErrors(validationErrors);

    setSubmitting(true);
    try {
      const user = await register({ name: values.name.trim(), email: values.email.trim(), password: values.password });
      toast.success(`Welcome to StockWise, ${user.name}!`);
      navigate("/", { replace: true });
    } catch (error) {
      setErrors(getFieldErrors(error));
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Staff accounts can view inventory and record stock in and out."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Input
          label="Full name"
          name="name"
          autoComplete="name"
          icon={User}
          value={values.name}
          onChange={handleChange}
          error={errors.name}
          placeholder="Juan Dela Cruz"
          maxLength={60}
          required
        />
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          icon={Mail}
          value={values.email}
          onChange={handleChange}
          error={errors.email}
          placeholder="you@example.com"
          required
        />
        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          icon={Lock}
          value={values.password}
          onChange={handleChange}
          error={errors.password}
          hint="At least 8 characters, with a letter and a number."
          required
        />
        <Input
          label="Confirm password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          icon={Lock}
          value={values.confirmPassword}
          onChange={handleChange}
          error={errors.confirmPassword}
          required
        />
        <Button type="submit" icon={UserPlus} loading={submitting} className="w-full">
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
