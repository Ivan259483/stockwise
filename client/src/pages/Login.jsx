import { Lock, LogIn, Mail } from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import useAuth from "../hooks/useAuth";
import useForm from "../hooks/useForm";
import { getFieldErrors } from "../utils/errors";
import { validateLogin } from "../utils/validators";
import AuthLayout from "../components/layout/AuthLayout";

/** Demo accounts created by `npm run seed`, shown so reviewers can try both roles. */
const DEMO_ACCOUNTS = [
  { role: "Admin", email: "admin@stockwise.com", password: "Admin123!" },
  { role: "Staff", email: "staff@stockwise.com", password: "Staff123!" },
];

/** Sign-in page. After login the user returns to the page they originally requested. */
export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { values, errors, setErrors, setValues, handleChange } = useForm({ email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationErrors = validateLogin(values);
    if (Object.keys(validationErrors).length) return setErrors(validationErrors);

    setSubmitting(true);
    try {
      await login({ email: values.email.trim(), password: values.password });
      navigate(location.state?.from?.pathname ?? "/", { replace: true });
    } catch (error) {
      setErrors(getFieldErrors(error));
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to manage your inventory."
      footer={
        <>
          New to StockWise?{" "}
          <Link to="/register" className="font-semibold text-primary-600 hover:text-primary-700">
            Create a staff account
          </Link>
        </>
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
        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          icon={Lock}
          value={values.password}
          onChange={handleChange}
          error={errors.password}
          placeholder="••••••••"
          required
        />
        <Button type="submit" icon={LogIn} loading={submitting} className="w-full">
          Sign in
        </Button>
      </form>

      <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3">
        <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Demo accounts</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.role}
              type="button"
              onClick={() => setValues({ email: account.email, password: account.password })}
              className="rounded-md bg-white px-3 py-2 text-left text-xs ring-1 ring-slate-200 transition hover:ring-primary-400"
            >
              <span className="block font-semibold text-slate-800">Use {account.role}</span>
              <span className="block truncate text-slate-500">{account.email}</span>
            </button>
          ))}
        </div>
      </div>
    </AuthLayout>
  );
}
