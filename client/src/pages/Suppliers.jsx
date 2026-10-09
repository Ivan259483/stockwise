import { Mail, Pencil, Phone, Plus, Trash2, Truck } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { deleteSupplier, getSuppliers } from "../api/suppliers";
import SupplierFormModal from "../components/forms/SupplierFormModal";
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

/** Supplier directory for everyone; create/edit/delete for admins. */
export default function Suppliers() {
  const { isAdmin } = useAuth();
  const { data: suppliers, loading, error, refetch } = useFetch(() => getSuppliers().then((body) => body.data));
  // `editing`: undefined = modal closed, null = creating, object = editing that supplier.
  const [editing, setEditing] = useState(undefined);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      const body = await deleteSupplier(toDelete._id);
      const updated = body.data.productsUpdated;
      toast.success(
        `"${toDelete.name}" deleted${updated ? `; ${updated} product${updated === 1 ? "" : "s"} now have no supplier` : ""}`
      );
      setToDelete(null);
      refetch();
    } catch {
      // Error toast comes from the axios interceptor.
    } finally {
      setDeleting(false);
    }
  };

  const contact = (s) => (
    <div className="space-y-0.5 text-sm">
      {s.phone && (
        <a href={`tel:${s.phone.replace(/\s/g, "")}`} className="flex items-center gap-1.5 text-slate-600 hover:text-primary-600">
          <Phone className="size-3.5 shrink-0" aria-hidden="true" />
          {s.phone}
        </a>
      )}
      {s.email && (
        <a href={`mailto:${s.email}`} className="flex items-center gap-1.5 text-slate-600 hover:text-primary-600">
          <Mail className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{s.email}</span>
        </a>
      )}
      {!s.phone && !s.email && <span className="text-slate-400">—</span>}
    </div>
  );

  const rowActions = (s) =>
    isAdmin && (
      <div className="flex justify-end gap-1">
        <Button variant="ghost" size="icon" icon={Pencil} onClick={() => setEditing(s)} aria-label={`Edit ${s.name}`} />
        <Button
          variant="ghost"
          size="icon"
          icon={Trash2}
          className="text-red-600 hover:bg-red-50 hover:text-red-700"
          onClick={() => setToDelete(s)}
          aria-label={`Delete ${s.name}`}
        />
      </div>
    );

  const columns = [
    {
      key: "name",
      header: "Supplier",
      render: (s) => (
        <div className="min-w-44">
          <p className="font-medium text-slate-900">{s.name}</p>
          <p className="text-xs text-slate-500">{s.contactPerson || "No contact person"}</p>
        </div>
      ),
    },
    { key: "contact", header: "Contact", render: contact },
    {
      key: "address",
      header: "Address",
      className: "hidden lg:table-cell",
      render: (s) => <span className="text-slate-500">{s.address || "—"}</span>,
    },
    { key: "products", header: "Products", render: (s) => <Badge tone="neutral">{s.productCount}</Badge> },
    ...(isAdmin ? [{ key: "actions", header: "Actions", align: "right", render: rowActions }] : []),
  ];

  const renderMobileCard = (s) => (
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-slate-900">{s.name}</p>
        <p className="mb-1 text-xs text-slate-500">
          {s.contactPerson || "No contact person"} · {s.productCount} product{s.productCount === 1 ? "" : "s"}
        </p>
        {contact(s)}
        {s.address && <p className="mt-1 text-xs text-slate-500">{s.address}</p>}
      </div>
      {rowActions(s)}
    </div>
  );

  return (
    <>
      <PageHeader
        title="Suppliers"
        description="The vendors you buy stock from."
        actions={
          isAdmin && (
            <Button icon={Plus} onClick={() => setEditing(null)}>
              Add supplier
            </Button>
          )
        }
      />

      <Card>
        {loading && !suppliers ? (
          <TableSkeleton />
        ) : error && !suppliers ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : suppliers.length === 0 ? (
          <EmptyState
            icon={Truck}
            title="No suppliers yet"
            description="Keep your suppliers' contact details in one place."
            action={
              isAdmin && (
                <Button icon={Plus} onClick={() => setEditing(null)}>
                  Add supplier
                </Button>
              )
            }
          />
        ) : (
          <Table columns={columns} rows={suppliers} caption="Suppliers" renderMobileCard={renderMobileCard} />
        )}
      </Card>

      <SupplierFormModal
        open={editing !== undefined}
        supplier={editing}
        onClose={() => setEditing(undefined)}
        onSaved={() => {
          setEditing(undefined);
          refetch();
        }}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete supplier?"
        message={
          <>
            <strong className="text-slate-900">{toDelete?.name}</strong> will be permanently deleted.
            {toDelete?.productCount > 0 && ` Its ${toDelete.productCount} product(s) will be kept but will no longer have a supplier.`}
          </>
        }
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}
