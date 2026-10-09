import { Trash2, Users as UsersIcon } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { deleteUser, getUsers, updateUser } from "../api/users";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import EmptyState from "../components/ui/EmptyState";
import ErrorState from "../components/ui/ErrorState";
import PageHeader from "../components/ui/PageHeader";
import Table, { TableSkeleton } from "../components/ui/Table";
import useAuth from "../hooks/useAuth";
import useFetch from "../hooks/useFetch";
import { formatDate } from "../utils/formatters";

const ROLE_OPTIONS = [
  { value: "staff", label: "Staff" },
  { value: "admin", label: "Admin" },
];

/**
 * Accessible on/off switch for the "active" flag.
 * @param {{ checked: boolean, onChange: (checked: boolean) => void, disabled?: boolean, label: string }} props
 */
function Toggle({ checked, onChange, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-emerald-500" : "bg-slate-300"
      }`}
    >
      <span className={`inline-block size-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5.5" : "translate-x-0.5"}`} />
    </button>
  );
}

/**
 * Admin-only user management: change role, activate/deactivate, delete.
 * Controls for your own account are disabled (the API enforces the same rule).
 */
export default function Users() {
  const { user: currentUser } = useAuth();
  const { data: users, loading, error, refetch } = useFetch(() => getUsers().then((body) => body.data));
  const [pendingId, setPendingId] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  /** Sends a PATCH and refreshes the list; the row is disabled while saving. */
  const changeUser = async (target, changes, successMessage) => {
    setPendingId(target._id);
    try {
      await updateUser(target._id, changes);
      toast.success(successMessage);
      refetch();
    } catch {
      // Error toast comes from the axios interceptor.
    } finally {
      setPendingId(null);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteUser(toDelete._id);
      toast.success(`${toDelete.name}'s account was deleted`);
      setToDelete(null);
      refetch();
    } catch {
      // Error toast comes from the axios interceptor.
    } finally {
      setDeleting(false);
    }
  };

  const isSelf = (u) => u._id === currentUser?._id;

  const roleSelect = (u) => (
    <select
      aria-label={`Role for ${u.name}`}
      value={u.role}
      disabled={isSelf(u) || pendingId === u._id}
      onChange={(event) =>
        changeUser(u, { role: event.target.value }, `${u.name} is now ${event.target.value === "admin" ? "an admin" : "staff"}`)
      }
      className="rounded-lg border-0 bg-white py-1.5 pr-8 pl-3 text-sm shadow-sm ring-1 ring-slate-300 ring-inset focus:ring-2 focus:ring-primary-600 disabled:bg-slate-50 disabled:text-slate-500"
    >
      {ROLE_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );

  const activeToggle = (u) => (
    <div className="flex items-center gap-2">
      <Toggle
        checked={u.isActive}
        disabled={isSelf(u) || pendingId === u._id}
        label={`${u.isActive ? "Deactivate" : "Activate"} ${u.name}`}
        onChange={(isActive) =>
          changeUser(u, { isActive }, `${u.name} was ${isActive ? "activated" : "deactivated"}`)
        }
      />
      <span className={`text-sm ${u.isActive ? "text-emerald-700" : "text-slate-500"}`}>{u.isActive ? "Active" : "Inactive"}</span>
    </div>
  );

  const deleteButton = (u) => (
    <Button
      variant="ghost"
      size="icon"
      icon={Trash2}
      className="text-red-600 hover:bg-red-50 hover:text-red-700"
      disabled={isSelf(u)}
      onClick={() => setToDelete(u)}
      aria-label={`Delete ${u.name}`}
    />
  );

  const nameCell = (u) => (
    <div className="min-w-40">
      <p className="flex items-center gap-2 font-medium text-slate-900">
        {u.name}
        {isSelf(u) && <Badge tone="primary">You</Badge>}
      </p>
      <p className="text-xs text-slate-500">{u.email}</p>
    </div>
  );

  const columns = [
    { key: "name", header: "User", render: nameCell },
    { key: "role", header: "Role", render: roleSelect },
    { key: "status", header: "Status", render: activeToggle },
    { key: "joined", header: "Joined", className: "whitespace-nowrap", render: (u) => formatDate(u.createdAt) },
    { key: "actions", header: "Actions", align: "right", render: deleteButton },
  ];

  const renderMobileCard = (u) => (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        {nameCell(u)}
        {deleteButton(u)}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        {roleSelect(u)}
        {activeToggle(u)}
      </div>
    </div>
  );

  return (
    <>
      <PageHeader
        title="Users"
        description="Promote staff to admin, deactivate accounts that should no longer sign in, or remove them."
      />

      <Card>
        {loading && !users ? (
          <TableSkeleton />
        ) : error && !users ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : users.length === 0 ? (
          <EmptyState icon={UsersIcon} title="No users found" />
        ) : (
          <Table columns={columns} rows={users} caption="Users" renderMobileCard={renderMobileCard} />
        )}
      </Card>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete user?"
        message={
          <>
            <strong className="text-slate-900">{toDelete?.name}</strong> ({toDelete?.email}) will lose access permanently.
            Their past stock movements stay in the history. To block access temporarily, deactivate the account instead.
          </>
        }
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}
