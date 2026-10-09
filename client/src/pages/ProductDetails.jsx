import { ArrowDownToLine, ArrowLeft, ArrowUpFromLine, History, Package, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate, useParams } from "react-router-dom";
import { deleteProduct, getProduct } from "../api/products";
import StockMovementModal from "../components/forms/StockMovementModal";
import MovementsTable from "../components/stock/MovementsTable";
import { StockStatusBadge } from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import EmptyState from "../components/ui/EmptyState";
import ErrorState from "../components/ui/ErrorState";
import PageHeader from "../components/ui/PageHeader";
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

/** One product: info, current stock, stock in/out actions and recent history. */
export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { data, loading, error, refetch } = useFetch(() => getProduct(id).then((body) => body.data), [id]);
  const [movementType, setMovementType] = useState(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const backLink = (
    <Link to="/products" className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700">
      <ArrowLeft className="size-4" aria-hidden="true" /> Products
    </Link>
  );

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

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteProduct(product._id);
      toast.success(`"${product.name}" deleted`);
      navigate("/products", { replace: true });
    } catch {
      // Error toast comes from the axios interceptor.
      setDeleting(false);
    }
  };

  return (
    <>
      <PageHeader
        title={product.name}
        description={`SKU ${product.sku}`}
        actions={
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
                  icon={Trash2}
                  onClick={() => setConfirmingDelete(true)}
                  aria-label="Delete product"
                  className="text-red-600"
                />
              </>
            )}
          </>
        }
      >
        {backLink}
      </PageHeader>

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
              <Detail label="Supplier">{product.supplier?.name ?? "None"}</Detail>
              <Detail label="Unit">{product.unit}</Detail>
              <Detail label="Cost price">{formatCurrency(product.costPrice)}</Detail>
              <Detail label="Selling price">{formatCurrency(product.sellingPrice)}</Detail>
              <Detail label="Added">{formatDate(product.createdAt)}</Detail>
            </dl>
          </div>
          {product.description && <p className="mt-5 border-t border-slate-100 pt-4 text-sm text-slate-600">{product.description}</p>}
          {product.supplier?.phone && (
            <p className="mt-3 text-xs text-slate-500">
              Supplier contact: {product.supplier.contactPerson || "—"} · {product.supplier.phone}
            </p>
          )}
        </Card>

        <Card title="Current stock" bodyClassName="p-5">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold tracking-tight text-slate-900 tabular-nums">{formatNumber(product.quantity)}</span>
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

      <Card
        className="mt-6"
        title="Movement history"
        description="Last 20 stock movements for this product"
        actions={
          <Link to={`/movements?product=${product._id}`} className="text-sm font-semibold text-primary-600 hover:text-primary-700">
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

      <ConfirmDialog
        open={confirmingDelete}
        title="Delete product?"
        message={
          <>
            <strong className="text-slate-900">{product.name}</strong> will be removed from your catalogue. Its stock
            movement history is kept for your records.
          </>
        }
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </>
  );
}
