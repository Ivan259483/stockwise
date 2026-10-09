import { ArrowLeftRight, FilterX, Plus } from "lucide-react";
import { useState } from "react";
import { getProducts } from "../api/products";
import { getMovements } from "../api/stock";
import StockMovementModal from "../components/forms/StockMovementModal";
import MovementsTable from "../components/stock/MovementsTable";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import ErrorState from "../components/ui/ErrorState";
import Input from "../components/ui/Input";
import PageHeader from "../components/ui/PageHeader";
import Pagination from "../components/ui/Pagination";
import Select from "../components/ui/Select";
import { TableSkeleton } from "../components/ui/Table";
import useFetch from "../hooks/useFetch";
import useUrlFilters from "../hooks/useUrlFilters";
import { formatNumber } from "../utils/formatters";

const PAGE_SIZE = 15;
const DEFAULT_FILTERS = { product: "", type: "", from: "", to: "", page: "1" };
const TYPE_OPTIONS = [
  { value: "IN", label: "Stock in" },
  { value: "OUT", label: "Stock out" },
];

/** Full, filterable audit log of stock movements plus the "Record movement" action. */
export default function StockMovements() {
  const [filters, setFilters] = useUrlFilters(DEFAULT_FILTERS);
  const [modalOpen, setModalOpen] = useState(false);

  const { data: productList } = useFetch(() => getProducts({ limit: 100, sort: "name" }).then((body) => body.data));
  const { data, loading, error, refetch } = useFetch(
    () => getMovements({ ...filters, limit: PAGE_SIZE }),
    [filters.product, filters.type, filters.from, filters.to, filters.page]
  );

  const movements = data?.data ?? [];
  const hasFilters = Boolean(filters.product || filters.type || filters.from || filters.to);
  const productOptions = (productList ?? []).map((p) => ({ value: p._id, label: `${p.name} (${p.sku})` }));

  return (
    <>
      <PageHeader
        title="Stock movements"
        description={
          data
            ? `${formatNumber(data.total)} movement${data.total === 1 ? "" : "s"} recorded`
            : "History of every stock change"
        }
        actions={
          <Button icon={Plus} onClick={() => setModalOpen(true)}>
            Record movement
          </Button>
        }
      />

      <Card>
        <div className="grid gap-3 border-b border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto] lg:items-end">
          <Select
            label="Product"
            value={filters.product}
            onChange={(event) => setFilters({ product: event.target.value })}
            options={productOptions}
            placeholder="All products"
            className="sm:col-span-2 lg:col-span-1"
          />
          <Select
            label="Type"
            value={filters.type}
            onChange={(event) => setFilters({ type: event.target.value })}
            options={TYPE_OPTIONS}
            placeholder="All types"
          />
          <Input
            label="From"
            type="date"
            value={filters.from}
            max={filters.to || undefined}
            onChange={(event) => setFilters({ from: event.target.value })}
          />
          <Input
            label="To"
            type="date"
            value={filters.to}
            min={filters.from || undefined}
            onChange={(event) => setFilters({ to: event.target.value })}
          />
          <Button
            variant="ghost"
            icon={FilterX}
            disabled={!hasFilters}
            onClick={() => setFilters({ product: "", type: "", from: "", to: "" })}
          >
            Clear
          </Button>
        </div>

        {loading && !data ? (
          <TableSkeleton rows={8} />
        ) : error && !data ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : movements.length === 0 ? (
          <EmptyState
            icon={ArrowLeftRight}
            title={hasFilters ? "No movements match these filters" : "No stock movements yet"}
            description={
              hasFilters ? "Try a wider date range or another product." : "Record your first stock in or stock out."
            }
            action={
              hasFilters ? (
                <Button
                  variant="secondary"
                  icon={FilterX}
                  onClick={() => setFilters({ product: "", type: "", from: "", to: "" })}
                >
                  Clear filters
                </Button>
              ) : (
                <Button icon={Plus} onClick={() => setModalOpen(true)}>
                  Record movement
                </Button>
              )
            }
          />
        ) : (
          <div className={`transition-opacity ${loading ? "opacity-60" : ""}`} aria-busy={loading}>
            <MovementsTable movements={movements} />
            <Pagination
              page={data.page}
              totalPages={data.totalPages}
              total={data.total}
              limit={PAGE_SIZE}
              onPageChange={(page) => setFilters({ page })}
            />
          </div>
        )}
      </Card>

      <StockMovementModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          setModalOpen(false);
          // Show the new record at the top of page 1.
          if (filters.page !== "1") setFilters({ page: 1 });
          else refetch();
        }}
      />
    </>
  );
}
