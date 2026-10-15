import { ArrowLeft, Plus, Send, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { getProducts } from "../api/products";
import { createPurchaseOrder } from "../api/purchaseOrders";
import { getSuppliers } from "../api/suppliers";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import ErrorState from "../components/ui/ErrorState";
import Input from "../components/ui/Input";
import PageHeader from "../components/ui/PageHeader";
import Select from "../components/ui/Select";
import { PageLoader } from "../components/ui/Spinner";
import Textarea from "../components/ui/Textarea";
import useFetch from "../hooks/useFetch";
import { getFieldErrors } from "../utils/errors";
import { formatCurrency, formatNumber } from "../utils/formatters";
import { validatePurchaseOrder } from "../utils/validators";

let nextKey = 1;
/** A new, empty item row. `key` keeps React rows stable when one is removed. */
const emptyItem = (product = "", unitCost = "") => ({ key: nextKey++, product, quantity: "", unitCost });

/**
 * New purchase order (/purchase-orders/new), for staff and admins.
 *
 * Pick an active supplier, add one or more products with quantity and unit
 * cost (pre-filled from the product's cost price), and submit. The PO starts
 * as "Requested" and waits for an admin's approval. ?product=<id> pre-fills
 * the first row (used by the dashboard's "Order" shortcut).
 */
export default function PurchaseOrderForm() {
  const { data, loading, error, refetch } = useFetch(() =>
    Promise.all([
      getSuppliers().then((body) => body.data),
      getProducts({ limit: 100, sort: "name" }).then((body) => body.data),
    ])
  );

  if (loading && !data) return <PageLoader label="Loading suppliers and products…" />;
  if (error && !data) return <ErrorState error={error} onRetry={refetch} />;
  return <PurchaseOrderEditor suppliers={data[0]} products={data[1]} />;
}

/** The form itself, rendered once suppliers and products have loaded. */
function PurchaseOrderEditor({ suppliers, products }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const productById = useMemo(() => new Map(products.map((p) => [p._id, p])), [products]);
  // ?product=<id> pre-fills the first row and its usual supplier.
  const prefill = productById.get(searchParams.get("product") ?? "");
  const [supplier, setSupplier] = useState(prefill?.supplier?._id ?? "");
  const [items, setItems] = useState(() => [prefill ? emptyItem(prefill._id, String(prefill.costPrice)) : emptyItem()]);
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // The chosen supplier's own products are listed first.
  const productOptions = useMemo(() => {
    const fromSupplier = (p) => Boolean(supplier) && p.supplier?._id === supplier;
    return [...products]
      .sort((a, b) => Number(fromSupplier(b)) - Number(fromSupplier(a)))
      .map((p) => ({
        value: p._id,
        label: `${p.name} (${p.sku}) · ${formatNumber(p.quantity)} ${p.unit} on hand${fromSupplier(p) ? " ★" : ""}`,
      }));
  }, [products, supplier]);

  const updateItem = (key, changes) => {
    setItems((rows) => rows.map((row) => (row.key === key ? { ...row, ...changes } : row)));
    setErrors({});
  };

  const chooseProduct = (key, productId) => {
    const product = productById.get(productId);
    updateItem(key, { product: productId, unitCost: product ? String(product.costPrice) : "" });
  };

  const total = items.reduce((sum, row) => sum + (Number(row.quantity) || 0) * (Number(row.unitCost) || 0), 0);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationErrors = validatePurchaseOrder({ supplier, items });
    if (Object.keys(validationErrors).length) return setErrors(validationErrors);

    setSaving(true);
    try {
      const body = await createPurchaseOrder({
        supplier,
        items: items.map((row) => ({
          product: row.product,
          quantity: Number(row.quantity),
          unitCost: Number(row.unitCost),
        })),
        notes: notes.trim(),
      });
      toast.success(body.message);
      navigate(`/purchase-orders/${body.data._id}`, { replace: true });
    } catch (submitError) {
      // The toast shows the message; field errors (e.g. an archived product) go next to the row.
      setErrors(getFieldErrors(submitError));
      setSaving(false);
    }
  };

  const backLink = (
    <Link
      to="/purchase-orders"
      className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700"
    >
      <ArrowLeft className="size-4" aria-hidden="true" /> Purchase orders
    </Link>
  );

  return (
    <>
      <PageHeader
        title="New purchase order"
        description="The request goes to an admin for approval before it is sent to the supplier."
      >
        {backLink}
      </PageHeader>

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <Card title="Supplier" bodyClassName="grid gap-4 p-5 sm:grid-cols-2">
          <Select
            label="Supplier"
            name="supplier"
            value={supplier}
            onChange={(event) => {
              setSupplier(event.target.value);
              setErrors({});
            }}
            error={errors.supplier}
            options={suppliers.map((s) => ({ value: s._id, label: s.name }))}
            placeholder="Choose a supplier…"
            hint="Products this supplier usually provides are marked ★ and listed first."
            required
          />
          <Textarea
            label="Notes"
            name="notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Optional, e.g. delivery instructions or quotation number"
            maxLength={500}
            rows={2}
          />
        </Card>

        <Card
          title="Items"
          description="Unit cost starts at the product's current cost price; change it to match the supplier's quotation."
          actions={
            <Button
              variant="secondary"
              size="sm"
              icon={Plus}
              onClick={() => setItems((rows) => [...rows, emptyItem()])}
            >
              Add item
            </Button>
          }
        >
          <ul className="divide-y divide-slate-100">
            {items.map((row, index) => {
              const product = productById.get(row.product);
              const lineTotal = (Number(row.quantity) || 0) * (Number(row.unitCost) || 0);
              return (
                <li key={row.key} className="grid gap-3 p-4 sm:grid-cols-12 sm:items-start" data-testid="po-item">
                  <Select
                    label={`Product ${index + 1}`}
                    name={`items[${index}].product`}
                    value={row.product}
                    onChange={(event) => chooseProduct(row.key, event.target.value)}
                    error={errors[`items[${index}].product`]}
                    options={productOptions}
                    placeholder="Choose a product…"
                    className="sm:col-span-5"
                    required
                  />
                  <Input
                    label={`Quantity${product ? ` (${product.unit})` : ""}`}
                    name={`items[${index}].quantity`}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    step={1}
                    value={row.quantity}
                    onChange={(event) => updateItem(row.key, { quantity: event.target.value })}
                    error={errors[`items[${index}].quantity`]}
                    className="sm:col-span-2"
                    required
                  />
                  <Input
                    label="Unit cost (₱)"
                    name={`items[${index}].unitCost`}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    value={row.unitCost}
                    onChange={(event) => updateItem(row.key, { unitCost: event.target.value })}
                    error={errors[`items[${index}].unitCost`]}
                    className="sm:col-span-2"
                    required
                  />
                  <div className="flex items-end justify-between gap-2 sm:col-span-3 sm:h-full sm:pt-7">
                    <p className="text-sm">
                      <span className="text-slate-500">Line total </span>
                      <span className="font-semibold text-slate-900 tabular-nums">{formatCurrency(lineTotal)}</span>
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      icon={Trash2}
                      className="text-red-600 hover:bg-red-50"
                      disabled={items.length === 1}
                      onClick={() => setItems((rows) => rows.filter((r) => r.key !== row.key))}
                      aria-label={`Remove item ${index + 1}`}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">
              {items.length} item{items.length === 1 ? "" : "s"} ·{" "}
              <span className="font-semibold text-slate-900">Total {formatCurrency(total)}</span>
            </p>
            {errors.items && (
              <p className="text-sm font-medium text-red-600" role="alert">
                {errors.items}
              </p>
            )}
          </div>
        </Card>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" to="/purchase-orders">
            Cancel
          </Button>
          <Button type="submit" icon={Send} loading={saving}>
            Submit request
          </Button>
        </div>
      </form>
    </>
  );
}
