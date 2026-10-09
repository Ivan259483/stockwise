import { AlertTriangle, ArrowRight, Boxes, PackageX, PlusCircle, Wallet } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { getDashboardSummary } from "../api/dashboard";
import MovementTrendChart from "../components/dashboard/MovementTrendChart";
import ValueByCategoryChart from "../components/dashboard/ValueByCategoryChart";
import StockMovementModal from "../components/forms/StockMovementModal";
import { MovementTypeBadge, StockStatusBadge } from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import ErrorState from "../components/ui/ErrorState";
import PageHeader from "../components/ui/PageHeader";
import { PageLoader } from "../components/ui/Spinner";
import StatCard from "../components/ui/StatCard";
import useAuth from "../hooks/useAuth";
import useFetch from "../hooks/useFetch";
import { formatDateTime, formatNumber, formatWholeCurrency } from "../utils/formatters";

/** Home page: stock KPIs, charts, items to restock and the latest movements. */
export default function Dashboard() {
  const { user } = useAuth();
  const { data, loading, error, refetch } = useFetch(() => getDashboardSummary().then((body) => body.data));
  const [restockProduct, setRestockProduct] = useState(null);

  const header = (
    <PageHeader
      title={`Hello, ${user?.name?.split(" ")[0] ?? "there"}`}
      description="Here's what's happening with your inventory today."
      actions={
        <Button to="/movements" variant="secondary" icon={ArrowRight}>
          Stock movements
        </Button>
      }
    />
  );

  if (loading && !data)
    return (
      <>
        {header}
        <PageLoader label="Loading dashboard…" />
      </>
    );
  if (error && !data)
    return (
      <>
        {header}
        <Card>
          <ErrorState error={error} onRetry={refetch} />
        </Card>
      </>
    );

  const hasProducts = data.totalProducts > 0;

  return (
    <>
      {header}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total products"
          value={formatNumber(data.totalProducts)}
          hint={`${formatNumber(data.totalUnits)} units on hand`}
          icon={Boxes}
          to="/products"
        />
        <StatCard
          label="Total stock value"
          value={formatWholeCurrency(data.totalStockValue)}
          hint="At cost price"
          icon={Wallet}
          tone="success"
        />
        <StatCard
          label="Low stock"
          value={formatNumber(data.lowStockCount)}
          hint="At or below reorder level"
          icon={AlertTriangle}
          tone="warning"
          to="/products?status=low_stock"
        />
        <StatCard
          label="Out of stock"
          value={formatNumber(data.outOfStockCount)}
          hint="Needs restocking now"
          icon={PackageX}
          tone="danger"
          to="/products?status=out_of_stock"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card title="Stock value by category" description="Value of stock on hand at cost" bodyClassName="p-4">
          {hasProducts ? (
            <ValueByCategoryChart data={data.valueByCategory} />
          ) : (
            <EmptyState title="No products yet" description="Add products to see their value by category." />
          )}
        </Card>
        <Card title="Stock in vs. stock out" description="Units moved over the last 7 days" bodyClassName="p-4">
          <MovementTrendChart data={data.movementsByDay} />
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card
          title="Needs restocking"
          description="Lowest stock first"
          actions={
            <Link
              to="/products?status=low_stock"
              className="text-sm font-semibold text-primary-600 hover:text-primary-700"
            >
              View all
            </Link>
          }
        >
          {data.lowStockItems.length === 0 ? (
            <EmptyState
              icon={Boxes}
              title="All stocked up"
              description="No products are at or below their reorder level."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.lowStockItems.map((item) => (
                <li key={item._id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/products/${item._id}`}
                      className="block truncate text-sm font-medium text-slate-900 hover:text-primary-600"
                    >
                      {item.name}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {formatNumber(item.quantity)} {item.unit} left · reorder at {formatNumber(item.reorderLevel)}
                    </p>
                  </div>
                  <span className="hidden sm:block">
                    <StockStatusBadge status={item.stockStatus} />
                  </span>
                  <Button size="sm" variant="secondary" icon={PlusCircle} onClick={() => setRestockProduct(item)}>
                    Restock
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Recent movements"
          actions={
            <Link to="/movements" className="text-sm font-semibold text-primary-600 hover:text-primary-700">
              View all
            </Link>
          }
        >
          {data.recentMovements.length === 0 ? (
            <EmptyState title="No movements yet" description="Stock in and stock out records will appear here." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.recentMovements.map((movement) => (
                <li key={movement._id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{movement.productName}</p>
                    <p className="truncate text-xs text-slate-500">
                      {movement.reason} · {movement.performedBy?.name ?? "Deleted user"} ·{" "}
                      {formatDateTime(movement.createdAt)}
                    </p>
                  </div>
                  <span className="hidden sm:block">
                    <MovementTypeBadge type={movement.type} />
                  </span>
                  <span
                    className={`w-14 text-right text-sm font-semibold tabular-nums ${movement.type === "IN" ? "text-emerald-600" : "text-red-600"}`}
                  >
                    {movement.type === "IN" ? "+" : "−"}
                    {formatNumber(movement.quantity)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <StockMovementModal
        open={Boolean(restockProduct)}
        product={restockProduct}
        defaultType="IN"
        onClose={() => setRestockProduct(null)}
        onSuccess={() => {
          setRestockProduct(null);
          refetch();
        }}
      />
    </>
  );
}
