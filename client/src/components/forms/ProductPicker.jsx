import { getProducts } from "../../api/products";
import useFetch from "../../hooks/useFetch";
import { formatNumber } from "../../utils/formatters";
import Select from "../ui/Select";
import Spinner from "../ui/Spinner";

/** Max products offered in the picker; plenty for a small store. */
const PICKER_LIMIT = 100;

/**
 * "Current stock: 15 pcs" summary line.
 * @param {{ product: { quantity: number, unit: string } }} props
 */
export function CurrentStock({ product }) {
  return (
    <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
      Current stock:{" "}
      <strong className="text-slate-900">
        {formatNumber(product.quantity)} {product.unit}
      </strong>
    </p>
  );
}

/**
 * Product dropdown for the stock movement form, followed by the selected
 * product's current stock. It mounts each time the modal opens, so the list
 * (and the quantities shown) are always fresh.
 *
 * @param {{ value: string, onChange: (event: Event) => void, error?: string }} props
 */
export default function ProductPicker({ value, onChange, error }) {
  const { data: products, loading } = useFetch(() =>
    getProducts({ limit: PICKER_LIMIT, sort: "name" }).then((body) => body.data)
  );

  if (loading && !products) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Spinner size="sm" /> Loading products…
      </div>
    );
  }

  const list = products ?? [];
  const selected = list.find((p) => p._id === value);

  return (
    <>
      <Select
        label="Product"
        name="productId"
        value={value}
        onChange={onChange}
        error={error}
        options={list.map((p) => ({
          value: p._id,
          label: `${p.name} (${p.sku}) · ${formatNumber(p.quantity)} ${p.unit}`,
        }))}
        placeholder="Choose a product…"
        required
      />
      {selected && <CurrentStock product={selected} />}
    </>
  );
}
