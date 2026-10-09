import { Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { deleteCategory, getCategories } from "../api/categories";
import CategoryFormModal from "../components/forms/CategoryFormModal";
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

/** Category list for everyone; create/edit/delete for admins. */
export default function Categories() {
  const { isAdmin } = useAuth();
  const { data: categories, loading, error, refetch } = useFetch(() => getCategories().then((body) => body.data));
  // `editing`: undefined = modal closed, null = creating, object = editing that category.
  const [editing, setEditing] = useState(undefined);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteCategory(toDelete._id);
      toast.success(`"${toDelete.name}" deleted`);
      setToDelete(null);
      refetch();
    } catch {
      // A 409 ("still has products") is shown as a toast by the axios interceptor.
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const productsLink = (category) => (
    <Link to={`/products?category=${category._id}`} className="hover:underline">
      <Badge tone={category.productCount ? "primary" : "neutral"}>
        {category.productCount} product{category.productCount === 1 ? "" : "s"}
      </Badge>
    </Link>
  );

  const rowActions = (category) =>
    isAdmin && (
      <div className="flex justify-end gap-1">
        <Button
          variant="ghost"
          size="icon"
          icon={Pencil}
          onClick={() => setEditing(category)}
          aria-label={`Edit ${category.name}`}
        />
        <Button
          variant="ghost"
          size="icon"
          icon={Trash2}
          className="text-red-600 hover:bg-red-50 hover:text-red-700"
          onClick={() => setToDelete(category)}
          aria-label={`Delete ${category.name}`}
        />
      </div>
    );

  const columns = [
    { key: "name", header: "Name", render: (c) => <span className="font-medium text-slate-900">{c.name}</span> },
    {
      key: "description",
      header: "Description",
      render: (c) => <span className="text-slate-500">{c.description || "—"}</span>,
    },
    { key: "products", header: "Products", render: productsLink },
    ...(isAdmin ? [{ key: "actions", header: "Actions", align: "right", render: rowActions }] : []),
  ];

  const renderMobileCard = (c) => (
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-slate-900">{c.name}</p>
        {c.description && <p className="mt-0.5 text-sm text-slate-500">{c.description}</p>}
        <div className="mt-2">{productsLink(c)}</div>
      </div>
      {rowActions(c)}
    </div>
  );

  return (
    <>
      <PageHeader
        title="Categories"
        description="Group your products so they are easier to find and report on."
        actions={
          isAdmin && (
            <Button icon={Plus} onClick={() => setEditing(null)}>
              Add category
            </Button>
          )
        }
      />

      <Card>
        {loading && !categories ? (
          <TableSkeleton />
        ) : error && !categories ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : categories.length === 0 ? (
          <EmptyState
            icon={Tags}
            title="No categories yet"
            description="Categories like “Hand Tools” or “Plumbing” keep your catalogue organised."
            action={
              isAdmin && (
                <Button icon={Plus} onClick={() => setEditing(null)}>
                  Add category
                </Button>
              )
            }
          />
        ) : (
          <Table columns={columns} rows={categories} caption="Categories" renderMobileCard={renderMobileCard} />
        )}
      </Card>

      <CategoryFormModal
        open={editing !== undefined}
        category={editing}
        onClose={() => setEditing(undefined)}
        onSaved={() => {
          setEditing(undefined);
          refetch();
        }}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete category?"
        message={
          toDelete?.productCount ? (
            <>
              <strong className="text-slate-900">{toDelete.name}</strong> still has {toDelete.productCount} product(s).
              Categories that are in use cannot be deleted; move those products to another category first.
            </>
          ) : (
            <>
              <strong className="text-slate-900">{toDelete?.name}</strong> will be permanently deleted.
            </>
          )
        }
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}
