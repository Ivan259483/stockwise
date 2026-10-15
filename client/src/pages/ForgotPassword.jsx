import { ArrowLeft, Mail, Send } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { forgotPassword } from "../api/auth";
import AuthLayout from "../components/layout/AuthLayout";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import useForm from "../hooks/useForm";
import { getFieldErrors } from "../utils/errors";
import { validateEmailOnly } from "../utils/validators";

/**
 * Password recovery, step 1: ask for the account email.
 *
 * The API answers the same way whether or not the email is registered (so
 * nobody can use this page to discover accounts), then emails a 6-digit code
 * that expires in 15 minutes. Step 2 is the Reset Password page.
 */
export default function ForgotPassword() {
  const navigate = useNavigate();
  const { values, errors, setErrors, handleChange } = useForm({ email: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationErrors = validateEmailOnly(values);
    if (Object.keys(validationErrors).length) return setErrors(validationErrors);

    setSubmitting(true);
    try {
      const email = values.email.trim().toLowerCase();
      const body = await forgotPassword({ email });
      navigate(`/reset-password?email=${encodeURIComponent(email)}`, { state: { notice: body.message } });
    } catch (error) {
      setErrors(getFieldErrors(error));
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Forgot your password?"
      subtitle="Enter your account email and we'll send you a 6-digit code to reset it."
      footer={
        <Link
          to="/login"
          className="inline-flex items-center gap-1 font-semibold text-primary-600 hover:text-primary-700"
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> Back to sign in
        </Link>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
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
        <Button type="submit" icon={Send} loading={submitting} className="w-full">
          Send reset code
        </Button>
      </form>
    </AuthLayout>
  );
}
