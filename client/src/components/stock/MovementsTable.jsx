import { Link } from "react-router-dom";
import { formatDateTime, formatNumber } from "../../utils/formatters";
import { MovementTypeBadge } from "../ui/Badge";
import Table from "../ui/Table";

/** "+10" in green or "−5" in red. */
function QuantityChange({ movement }) {
  const isIn = movement.type === "IN";
  return (
    <span className={`font-semibold tabular-nums ${isIn ? "text-emerald-600" : "text-red-600"}`}>
      {isIn ? "+" : "−"}
      {formatNumber(movement.quantity)}
    </span>
  );
}

/**
 * Stock movement history, shared by the Stock Movements page and Product Details.
 * Product names come from the movement's snapshot, so deleted products still display.
 *
 * @param {{ movements: object[], showProduct?: boolean }} props
 */
export default function MovementsTable({ movements, showProduct = true }) {
  const columns = [
    {
      key: "date",
      header: "Date",
      className: "whitespace-nowrap",
      render: (m) => formatDateTime(m.createdAt),
    },
    ...(showProduct
      ? [
          {
            key: "product",
            header: "Product",
            render: (m) => (
              <div className="min-w-40">
                <Link to={`/products/${m.product}`} className="font-medium text-slate-900 hover:text-primary-600">
                  {m.productName}
                </Link>
                <p className="font-mono text-xs text-slate-500">{m.sku}</p>
              </div>
            ),
          },
        ]
      : []),
    { key: "type", header: "Type", render: (m) => <MovementTypeBadge type={m.type} /> },
    { key: "quantity", header: "Qty", align: "right", render: (m) => <QuantityChange movement={m} /> },
    {
      key: "stock",
      header: "Stock",
      align: "right",
      className: "whitespace-nowrap",
      render: (m) => (
        <span className="text-slate-500 tabular-nums">
          {formatNumber(m.previousQty)} → <span className="font-semibold text-slate-900">{formatNumber(m.newQty)}</span>
        </span>
      ),
    },
    { key: "reason", header: "Reason" },
    {
      key: "note",
      header: "Note",
      className: "hidden xl:table-cell",
      render: (m) => <span className="line-clamp-2 max-w-56 text-slate-500">{m.note || "—"}</span>,
    },
    { key: "by", header: "By", className: "whitespace-nowrap", render: (m) => m.performedBy?.name ?? "Deleted user" },
  ];

  const renderMobileCard = (m) => (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        {showProduct && (
          <Link to={`/products/${m.product}`} className="block truncate font-medium text-slate-900">
            {m.productName}
          </Link>
        )}
        <p className="text-sm text-slate-600">
          {m.reason} · {formatNumber(m.previousQty)} → {formatNumber(m.newQty)}
        </p>
        {m.note && <p className="truncate text-xs text-slate-500">{m.note}</p>}
        <p className="mt-1 text-xs text-slate-500">
          {formatDateTime(m.createdAt)} · {m.performedBy?.name ?? "Deleted user"}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <QuantityChange movement={m} />
        <MovementTypeBadge type={m.type} />
      </div>
    </div>
  );

  return <Table columns={columns} rows={movements} caption="Stock movements" renderMobileCard={renderMobileCard} />;
}
