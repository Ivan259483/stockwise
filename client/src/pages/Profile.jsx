import { KeyRound, Lock, Mail, Save, User } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Input from "../components/ui/Input";
import PageHeader from "../components/ui/PageHeader";
import useAuth from "../hooks/useAuth";
import useForm from "../hooks/useForm";
import { getFieldErrors } from "../utils/errors";
import { formatDate } from "../utils/formatters";
import { validateNameEmail, validatePasswordChange } from "../utils/validators";

const EMPTY_PASSWORDS = { currentPassword: "", newPassword: "", confirmPassword: "" };

/** Read-only label/value row in the account summary. */
function Detail({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-900">{children}</dd>
    </div>
  );
}

/**
 * "My profile" page for every signed-in user.
 *
 * Users can edit their own name and email and change their password. Role
 * and account status are shown but only an admin can change them (Users page).
 * Changing the password signs out the user's other sessions; this one stays
 * signed in because the API returns a fresh token.
 */
export default function Profile() {
  const { user, updateProfile, changePassword } = useAuth();
  const profile = useForm({ name: user.name, email: user.email });
  const passwords = useForm(EMPTY_PASSWORDS);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const profileChanged = profile.values.name.trim() !== user.name || profile.values.email.trim() !== user.email;

  const saveProfile = async (event) => {
    event.preventDefault();
    const errors = validateNameEmail(profile.values);
    if (Object.keys(errors).length) return profile.setErrors(errors);

    setSavingProfile(true);
    try {
      const updated = await updateProfile({ name: profile.values.name.trim(), email: profile.values.email.trim() });
      profile.reset({ name: updated.name, email: updated.email });
      toast.success("Profile updated");
    } catch (error) {
      profile.setErrors(getFieldErrors(error));
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (event) => {
    event.preventDefault();
    const errors = validatePasswordChange(passwords.values);
    if (Object.keys(errors).length) return passwords.setErrors(errors);

    setSavingPassword(true);
    try {
      await changePassword({
        currentPassword: passwords.values.currentPassword,
        newPassword: passwords.values.newPassword,
      });
      passwords.reset(EMPTY_PASSWORDS);
      toast.success("Password changed. Other devices have been signed out.");
    } catch (error) {
      passwords.setErrors(getFieldErrors(error));
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <>
      <PageHeader title="My profile" description="Update your name, email and password." />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Account" bodyClassName="px-5 py-2">
          <dl className="divide-y divide-slate-100">
            <Detail label="Role">
              <Badge tone={user.role === "admin" ? "primary" : "neutral"} className="capitalize">
                {user.role}
              </Badge>
            </Detail>
            <Detail label="Status">{user.isActive ? "Active" : "Inactive"}</Detail>
            <Detail label="Member since">{formatDate(user.createdAt)}</Detail>
            <Detail label="Password last changed">
              {user.passwordChangedAt ? formatDate(user.passwordChangedAt) : "Never"}
            </Detail>
          </dl>
          <p className="py-3 text-xs text-slate-500">Only an administrator can change your role or status.</p>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card
            title="Personal information"
            description="Your name appears in stock movement and purchase order history."
          >
            <form onSubmit={saveProfile} noValidate className="grid gap-4 p-5 sm:grid-cols-2">
              <Input
                label="Full name"
                name="name"
                autoComplete="name"
                icon={User}
                value={profile.values.name}
                onChange={profile.handleChange}
                error={profile.errors.name}
                maxLength={60}
                required
              />
              <Input
                label="Email"
                name="email"
                type="email"
                autoComplete="email"
                icon={Mail}
                value={profile.values.email}
                onChange={profile.handleChange}
                error={profile.errors.email}
                hint="Used to sign in and to receive password reset codes."
                required
              />
              <div className="sm:col-span-2">
                <Button type="submit" icon={Save} loading={savingProfile} disabled={!profileChanged}>
                  Save changes
                </Button>
              </div>
            </form>
          </Card>

          <Card title="Change password" description="Use at least 8 characters with a letter and a number.">
            <form onSubmit={savePassword} noValidate className="grid gap-4 p-5 sm:grid-cols-2">
              <Input
                label="Current password"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                icon={Lock}
                value={passwords.values.currentPassword}
                onChange={passwords.handleChange}
                error={passwords.errors.currentPassword}
                className="sm:col-span-2"
                required
              />
              <Input
                label="New password"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                icon={KeyRound}
                value={passwords.values.newPassword}
                onChange={passwords.handleChange}
                error={passwords.errors.newPassword}
                required
              />
              <Input
                label="Confirm new password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                icon={KeyRound}
                value={passwords.values.confirmPassword}
                onChange={passwords.handleChange}
                error={passwords.errors.confirmPassword}
                required
              />
              <div className="sm:col-span-2">
                <Button type="submit" icon={KeyRound} loading={savingPassword}>
                  Change password
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
