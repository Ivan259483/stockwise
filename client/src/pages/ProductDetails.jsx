import { Archive, ArrowDownToLine, ArrowLeft, ArrowUpFromLine, History, Package, Pencil } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate, useParams } from "react-router-dom";
import { archiveRecord } from "../api/archive";
import { getProduct } from "../api/products";
import StockMovementModal from "../components/forms/StockMovementModal";
import MovementsTable from "../components/stock/MovementsTable";
import { StockStatusBadge } from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import ErrorState from "../components/ui/ErrorState";
import PageHeader from "../components/ui/PageHeader";
import ReasonDialog from "../components/ui/ReasonDialog";
import { PageLoader } from "../components/ui/Spinner";
import useAuth from "../hooks/useAuth";
import useFetch from "../hooks/useFetch";
import { formatCurrency, formatDate, formatNumber } from "../utils/formatters";

/** Label/value pair in the product info grid. */
function Detail({ label, children }) {
  return (
    <div>
      <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</dt>
      <dd className="mt-1 text-sm text-slate-900">{children}</dd>
    </div>
  );
}

/**
 * Product details page (all roles).
 *
 * Shows the product, its current stock and its last 20 movements. Stock In and
 * Stock Out are available to staff as well, because recording movements is
 * their main job; Edit and Archive are admin-only (the API enforces the same).
 * An archived product (opened e.g. from old history) shows a banner and no actions.
 */
export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { data, loading, error, refetch } = useFetch(() => getProduct(id).then((body) => body.data), [id]);
  // Which movement form is open ("IN" / "OUT"); null means closed.
  const [movementType, setMovementType] = useState(null);
  const [confirmingArchive, setConfirmingArchive] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const backLink = (
    <Link
      to="/products"
      className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700"
    >
      <ArrowLeft className="size-4" aria-hidden="true" /> Products
    </Link>
  );

  // A bad or deleted id gets a friendly "not found" instead of a generic error.
  if (loading && !data) return <PageLoader label="Loading product…" />;
  if (error && !data) {
    const notFound = error.response?.status === 404 || error.response?.status === 400;
    return (
      <>
        <PageHeader title="Product">{backLink}</PageHeader>
        <Card>
          {notFound ? (
            <EmptyState
              icon={Package}
              title="Product not found"
              description="It may have been deleted. Its stock movement history is still available."
              action={<Button to="/products">Back to products</Button>}
            />
          ) : (
            <ErrorState error={error} onRetry={refetch} />
          )}
        </Card>
      </>
    );
  }

  const { product, movements } = data;

  // After archiving, the product is no longer in the catalogue, so go back to the list.
  const handleArchive = async (reason) => {
    setArchiving(true);
    try {
      await archiveRecord("products", product._id, reason);
      toast.success(`"${product.name}" archived`);
      navigate("/products", { replace: true });
    } catch {
      // Error toast comes from the axios interceptor (e.g. the product is on an open PO).
      setArchiving(false);
    }
  };

  return (
    <>
      <PageHeader
        title={product.name}
        description={`SKU ${product.sku}`}
        actions={
          !product.archived && (
            <>
              <Button variant="success" icon={ArrowDownToLine} onClick={() => setMovementType("IN")}>
                Stock in
              </Button>
              <Button variant="danger" icon={ArrowUpFromLine} onClick={() => setMovementType("OUT")}>
                Stock out
              </Button>
              {isAdmin && (
                <>
                  <Button to={`/products/${product._id}/edit`} variant="secondary" icon={Pencil}>
                    Edit
                  </Button>
                  <Button
                    variant="secondary"
                    icon={Archive}
                    onClick={() => setConfirmingArchive(true)}
                    aria-label="Archive product"
                    title="Archive product"
                    className="text-amber-700"
                  />
                </>
              )}
            </>
          )
        }
      >
        {backLink}
      </PageHeader>

      {product.archived && (
        <div
          className="mb-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-600/30"
          role="status"
        >
          <p className="font-semibold">This product is archived.</p>
          <p>
            Archived {formatDate(product.archivedAt)} by {product.archivedBy?.name ?? "an admin"}
            {product.archiveReason && `: ${product.archiveReason}`}. It is hidden from the catalogue and cannot be
            stocked in or out.{" "}
            {isAdmin && (
              <Link to="/archive?type=products" className="font-semibold underline">
                Restore it from the Archive page
              </Link>
            )}
          </p>
        </div>
      )}

      {/* Product information and current stock side by side on large screens */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="Product information" bodyClassName="p-5">
          <div className="flex flex-col gap-5 sm:flex-row">
            <div className="flex size-32 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
              {product.image ? (
                <img src={product.image} alt={product.name} className="size-full object-cover" />
              ) : (
                <Package className="size-12 text-slate-300" aria-hidden="true" />
              )}
            </div>
            <dl className="grid flex-1 grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-3">
              <Detail label="Category">{product.category?.name ?? "—"}</Detail>
              <Detail label="Supplier">
                {product.supplier?.name ?? "None"}
                {product.supplier?.archived && <span className="text-slate-500"> (archived)</span>}
              </Detail>
              <Detail label="Unit">{product.unit}</Detail>
              <Detail label="Cost price">{formatCurrency(product.costPrice)}</Detail>
              <Detail label="Selling price">{formatCurrency(product.sellingPrice)}</Detail>
              <Detail label="Added">{formatDate(product.createdAt)}</Detail>
            </dl>
          </div>
          {product.description && (
            <p className="mt-5 border-t border-slate-100 pt-4 text-sm text-slate-600">{product.description}</p>
          )}
          {product.supplier?.phone && (
            <p className="mt-3 text-xs text-slate-500">
              Supplier contact: {product.supplier.contactPerson || "—"} · {product.supplier.phone}
            </p>
          )}
        </Card>

        <Card title="Current stock" bodyClassName="p-5">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold tracking-tight text-slate-900 tabular-nums">
              {formatNumber(product.quantity)}
            </span>
            <span className="text-slate-500">{product.unit}</span>
          </div>
          <div className="mt-2">
            <StockStatusBadge status={product.stockStatus} />
          </div>
          <dl className="mt-5 space-y-3 border-t border-slate-100 pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Reorder level</dt>
              <dd className="font-medium text-slate-900">{formatNumber(product.reorderLevel)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Stock value (cost)</dt>
              <dd className="font-medium text-slate-900">{formatCurrency(product.stockValue)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Potential sales</dt>
              <dd className="font-medium text-slate-900">{formatCurrency(product.quantity * product.sellingPrice)}</dd>
            </div>
          </dl>
        </Card>
      </div>

      {/* Audit trail for this product; the full, filterable history is on the movements page */}
      <Card
        className="mt-6"
        title="Movement history"
        description="Last 20 stock movements for this product"
        actions={
          <Link
            to={`/movements?product=${product._id}`}
            className="text-sm font-semibold text-primary-600 hover:text-primary-700"
          >
            View full history
          </Link>
        }
      >
        {movements.length === 0 ? (
          <EmptyState
            icon={History}
            title="No movements yet"
            description="Record a stock in or stock out to start this product's history."
          />
        ) : (
          <MovementsTable movements={movements} showProduct={false} />
        )}
      </Card>

      {/* Refetch after a movement so the quantity, status and history update together */}
      <StockMovementModal
        open={Boolean(movementType)}
        product={product}
        defaultType={movementType ?? "IN"}
        onClose={() => setMovementType(null)}
        onSuccess={() => {
          setMovementType(null);
          refetch();
        }}
      />

      <ReasonDialog
        open={confirmingArchive}
        title="Archive product?"
        message={
          <>
            <strong className="text-slate-900">{product.name}</strong> will be hidden from the catalogue, stock forms
            and purchase orders. Its history is kept and an admin can restore it from the Archive page.
          </>
        }
        placeholder="e.g. Discontinued by the supplier"
        confirmLabel="Archive"
        loading={archiving}
        onConfirm={handleArchive}
        onCancel={() => setConfirmingArchive(false)}
      />
    </>
  );
}
