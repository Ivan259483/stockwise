import { ClipboardList, FilterX, Plus, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPurchaseOrders } from "../api/purchaseOrders";
import { PoStatusBadge } from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import EmptyState from "../components/ui/EmptyState";
import ErrorState from "../components/ui/ErrorState";
import Input from "../components/ui/Input";
import PageHeader from "../components/ui/PageHeader";
import Pagination from "../components/ui/Pagination";
import Table, { TableSkeleton } from "../components/ui/Table";
import useDebounce from "../hooks/useDebounce";
import useFetch from "../hooks/useFetch";
import useUrlFilters from "../hooks/useUrlFilters";
import { PO_STATUSES } from "../utils/constants";
import { formatCurrency, formatDate, formatNumber } from "../utils/formatters";

const PAGE_SIZE = 10;
const DEFAULT_FILTERS = { status: "", search: "", page: "1" };

/**
 * Purchase order list (all roles).
 *
 * Status tabs show how many POs are in each step of the workflow; the active
 * tab, search and page live in the URL so the dashboard can link straight to
 * e.g. ?status=Requested. Archived POs are not listed (see the Archive page).
 */
export default function PurchaseOrders() {
  const [filters, setFilters] = useUrlFilters(DEFAULT_FILTERS);
  const [searchText, setSearchText] = useState(filters.search);
  const debouncedSearch = useDebounce(searchText.trim(), 300);

  useEffect(() => {
    if (debouncedSearch !== filters.search) setFilters({ search: debouncedSearch });
  }, [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data, loading, error, refetch } = useFetch(
    () => getPurchaseOrders({ ...filters, limit: PAGE_SIZE }),
    [filters.status, filters.search, filters.page]
  );

  const orders = data?.data ?? [];
  const counts = data?.counts ?? {};
  const allCount = Object.values(counts).reduce((sum, n) => sum + n, 0);
  const tabs = [
    { value: "", label: "All", count: allCount },
    ...PO_STATUSES.map((s) => ({ value: s, label: s, count: counts[s] })),
  ];

  const poLink = (po) => (
    <Link to={`/purchase-orders/${po._id}`} className="font-mono font-semibold text-slate-900 hover:text-primary-600">
      {po.poNumber}
    </Link>
  );
  const itemSummary = (po) =>
    `${po.items.length} item${po.items.length === 1 ? "" : "s"} · ${formatNumber(po.items.reduce((sum, i) => sum + i.quantity, 0))} units`;

  const columns = [
    { key: "poNumber", header: "PO number", className: "whitespace-nowrap", render: poLink },
    {
      key: "supplier",
      header: "Supplier",
      render: (po) => (
        <div className="min-w-40">
          <p className="font-medium text-slate-900">{po.supplierName}</p>
          <p className="text-xs text-slate-500">{itemSummary(po)}</p>
        </div>
      ),
    },
    {
      key: "total",
      header: "Total",
      align: "right",
      className: "whitespace-nowrap",
      render: (po) => formatCurrency(po.totalAmount),
    },
    { key: "status", header: "Status", render: (po) => <PoStatusBadge status={po.status} /> },
    {
      key: "requestedBy",
      header: "Requested by",
      className: "hidden lg:table-cell whitespace-nowrap",
      render: (po) => po.requestedBy?.name ?? "—",
    },
    { key: "date", header: "Date", className: "whitespace-nowrap", render: (po) => formatDate(po.createdAt) },
  ];

  const renderMobileCard = (po) => (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        {poLink(po)}
        <p className="truncate text-sm text-slate-700">{po.supplierName}</p>
        <p className="text-xs text-slate-500">
          {itemSummary(po)} · {formatDate(po.createdAt)}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="text-sm font-semibold text-slate-900">{formatCurrency(po.totalAmount)}</span>
        <PoStatusBadge status={po.status} />
      </div>
    </div>
  );

  const hasFilters = Boolean(filters.status || filters.search);
  const clearFilters = () => {
    setSearchText("");
    setFilters({ status: "", search: "" });
  };

  return (
    <>
      <PageHeader
        title="Purchase orders"
        description="Request stock from suppliers, get admin approval, and receive deliveries into stock."
        actions={
          <Button to="/purchase-orders/new" icon={Plus}>
            New purchase order
          </Button>
        }
      />

      <Card>
        {/* Status tabs (scroll sideways on phones) and search */}
        <div className="space-y-3 border-b border-slate-200 p-4">
          <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Filter by status">
            {tabs.map((tab) => {
              const active = filters.status === tab.value;
              return (
                <button
                  key={tab.label}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilters({ status: tab.value })}
                  className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    active ? "bg-primary-600 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {tab.label}
                  <span
                    className={`rounded-full px-1.5 text-xs tabular-nums ${active ? "bg-white/20" : "bg-slate-100 text-slate-600"}`}
                  >
                    {formatNumber(tab.count ?? 0)}
                  </span>
                </button>
              );
            })}
          </div>
          <Input
            aria-label="Search purchase orders"
            type="search"
            icon={Search}
            placeholder="Search by PO number, supplier or product…"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            className="max-w-md"
          />
        </div>

        {loading && !data ? (
          <TableSkeleton rows={PAGE_SIZE} />
        ) : error && !data ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : orders.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={hasFilters ? "No purchase orders match" : "No purchase orders yet"}
            description={
              hasFilters ? "Try another status or search term." : "Create a purchase order when stock runs low."
            }
            action={
              hasFilters ? (
                <Button variant="secondary" icon={FilterX} onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : (
                <Button to="/purchase-orders/new" icon={Plus}>
                  New purchase order
                </Button>
              )
            }
          />
        ) : (
          <div className={`transition-opacity ${loading ? "opacity-60" : ""}`} aria-busy={loading}>
            <Table columns={columns} rows={orders} caption="Purchase orders" renderMobileCard={renderMobileCard} />
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
    </>
  );
}
