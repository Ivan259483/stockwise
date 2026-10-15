import { ArrowLeft, Hash, KeyRound, Mail, RotateCw } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { forgotPassword, resetPassword } from "../api/auth";
import AuthLayout from "../components/layout/AuthLayout";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import useForm from "../hooks/useForm";
import { getFieldErrors } from "../utils/errors";
import { validateEmailOnly, validatePasswordReset } from "../utils/validators";

/**
 * Password recovery, step 2: enter the emailed 6-digit code and a new password.
 *
 * The code can be used once, expires after 15 minutes and allows 5 wrong
 * guesses. "Resend code" asks for a new one (the API sends at most one per
 * minute per account). After a successful reset the user signs in again.
 */
export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { values, errors, setErrors, handleChange } = useForm({
    email: searchParams.get("email") ?? "",
    code: "",
    password: "",
    confirmPassword: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const notice = location.state?.notice;

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationErrors = validatePasswordReset(values);
    if (Object.keys(validationErrors).length) return setErrors(validationErrors);

    setSubmitting(true);
    try {
      const body = await resetPassword({
        email: values.email.trim().toLowerCase(),
        code: values.code.trim(),
        password: values.password,
      });
      toast.success(body.message);
      navigate("/login", { replace: true });
    } catch (error) {
      setErrors(getFieldErrors(error));
      setSubmitting(false);
    }
  };

  const resend = async () => {
    const emailErrors = validateEmailOnly(values);
    if (Object.keys(emailErrors).length) return setErrors(emailErrors);
    setResending(true);
    try {
      await forgotPassword({ email: values.email.trim().toLowerCase() });
      toast.success("If the account exists, a new code is on its way (one per minute).");
    } catch {
      // Error toast comes from the axios interceptor.
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter the 6-digit code we emailed you, then choose a new password."
      footer={
        <Link
          to="/login"
          className="inline-flex items-center gap-1 font-semibold text-primary-600 hover:text-primary-700"
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> Back to sign in
        </Link>
      }
    >
      {notice && (
        <p
          className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 ring-1 ring-emerald-600/20"
          role="status"
        >
          {notice}
        </p>
      )}
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
          required
        />
        <Input
          label="6-digit code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          icon={Hash}
          value={values.code}
          onChange={handleChange}
          error={errors.code}
          placeholder="123456"
          maxLength={6}
          className="[&_input]:tracking-[0.3em]"
          required
        />
        <Input
          label="New password"
          name="password"
          type="password"
          autoComplete="new-password"
          icon={KeyRound}
          value={values.password}
          onChange={handleChange}
          error={errors.password}
          hint="At least 8 characters, with a letter and a number."
          required
        />
        <Input
          label="Confirm new password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          icon={KeyRound}
          value={values.confirmPassword}
          onChange={handleChange}
          error={errors.confirmPassword}
          required
        />
        <Button type="submit" icon={KeyRound} loading={submitting} className="w-full">
          Reset password
        </Button>
      </form>
      <div className="mt-4 text-center">
        <Button variant="ghost" size="sm" icon={RotateCw} loading={resending} onClick={resend}>
          Didn&apos;t get it? Resend code
        </Button>
      </div>
    </AuthLayout>
  );
}
