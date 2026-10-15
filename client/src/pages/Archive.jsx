import {
  Archive as ArchiveIcon,
  ArchiveRestore,
  ClipboardList,
  Eye,
  Package,
  Search,
  Truck,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { getArchived, restoreRecord } from "../api/archive";
import Badge, { PoStatusBadge } from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import EmptyState from "../components/ui/EmptyState";
import ErrorState from "../components/ui/ErrorState";
import Input from "../components/ui/Input";
import Modal from "../components/ui/Modal";
import PageHeader from "../components/ui/PageHeader";
import Pagination from "../components/ui/Pagination";
import Table, { TableSkeleton } from "../components/ui/Table";
import useDebounce from "../hooks/useDebounce";
import useFetch from "../hooks/useFetch";
import useUrlFilters from "../hooks/useUrlFilters";
import { formatCurrency, formatDate, formatDateTime, formatNumber } from "../utils/formatters";

const PAGE_SIZE = 10;
const DEFAULT_FILTERS = { type: "products", search: "", page: "1" };

/**
 * One entry per tab: how to name a record, its secondary line, and the
 * fields shown in the "View" dialog.
 */
const TYPES = {
  products: {
    label: "Products",
    icon: Package,
    title: (r) => r.name,
    subtitle: (r) => `${r.sku} · ${r.category?.name ?? "No category"}`,
    details: (r) => [
      ["SKU", r.sku],
      ["Category", r.category?.name ?? "—"],
      ["Quantity on hand", `${formatNumber(r.quantity)} ${r.unit}`],
      ["Cost / selling price", `${formatCurrency(r.costPrice)} / ${formatCurrency(r.sellingPrice)}`],
      ["Reorder level", formatNumber(r.reorderLevel)],
    ],
    link: (r) => `/products/${r._id}`,
  },
  suppliers: {
    label: "Suppliers",
    icon: Truck,
    title: (r) => r.name,
    subtitle: (r) => r.contactPerson || r.email || "No contact person",
    details: (r) => [
      ["Contact person", r.contactPerson || "—"],
      ["Phone", r.phone || "—"],
      ["Email", r.email || "—"],
      ["Address", r.address || "—"],
    ],
  },
  users: {
    label: "Users",
    icon: Users,
    title: (r) => r.name,
    subtitle: (r) => `${r.email} · ${r.role}`,
    details: (r) => [
      ["Email", r.email],
      ["Role", r.role],
      ["Status before archiving", r.isActive ? "Active" : "Inactive"],
      ["Member since", formatDate(r.createdAt)],
    ],
  },
  "purchase-orders": {
    label: "Purchase orders",
    icon: ClipboardList,
    title: (r) => r.poNumber,
    subtitle: (r) => `${r.supplierName} · ${formatCurrency(r.totalAmount)}`,
    details: (r) => [
      ["Supplier", r.supplierName],
      ["Status", <PoStatusBadge key="status" status={r.status} />],
      ["Items", r.items.map((i) => `${i.productName} × ${formatNumber(i.quantity)}`).join(", ")],
      ["Total", formatCurrency(r.totalAmount)],
      ["Requested by", r.requestedBy?.name ?? "—"],
    ],
    link: (r) => `/purchase-orders/${r._id}`,
  },
};

/**
 * Archive page (admin only).
 *
 * Archived products, suppliers, users and purchase orders never appear in the
 * normal lists, searches or dropdowns; this is the only place they are listed.
 * Each record shows when, by whom and why it was archived, and can be viewed
 * or restored. Nothing is ever hard-deleted, so all history stays intact.
 */
export default function Archive() {
  const [filters, setFilters] = useUrlFilters(DEFAULT_FILTERS);
  const type = TYPES[filters.type] ? filters.type : "products";
  const config = TYPES[type];
  const [searchText, setSearchText] = useState(filters.search);
  const debouncedSearch = useDebounce(searchText.trim(), 300);
  const [viewing, setViewing] = useState(null);
  const [toRestore, setToRestore] = useState(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (debouncedSearch !== filters.search) setFilters({ search: debouncedSearch });
  }, [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data, loading, error, refetch } = useFetch(
    () => getArchived(type, { search: filters.search, page: filters.page, limit: PAGE_SIZE }),
    [type, filters.search, filters.page]
  );
  const records = data?.data ?? [];

  const switchType = (next) => {
    setSearchText("");
    setFilters({ type: next, search: "" });
  };

  const confirmRestore = async () => {
    setRestoring(true);
    try {
      const body = await restoreRecord(type, toRestore._id);
      toast.success(body.message);
      setToRestore(null);
      setViewing(null);
      if (records.length === 1 && data.page > 1) setFilters({ page: data.page - 1 });
      else refetch();
    } catch {
      // Error toast comes from the axios interceptor.
    } finally {
      setRestoring(false);
    }
  };

  const actions = (r) => (
    <div className="flex justify-end gap-1">
      <Button
        variant="ghost"
        size="icon"
        icon={Eye}
        onClick={() => setViewing(r)}
        aria-label={`View ${config.title(r)}`}
      />
      <Button
        variant="secondary"
        size="sm"
        icon={ArchiveRestore}
        onClick={() => setToRestore(r)}
        aria-label={`Restore ${config.title(r)}`}
      >
        <span className="hidden sm:inline">Restore</span>
      </Button>
    </div>
  );

  const recordCell = (r) => (
    <div className="min-w-44">
      <p className="font-medium text-slate-900">{config.title(r)}</p>
      <p className="text-xs text-slate-500">{config.subtitle(r)}</p>
    </div>
  );

  const columns = [
    { key: "record", header: config.label.replace(/s$/, ""), render: recordCell },
    {
      key: "archivedAt",
      header: "Archived",
      className: "whitespace-nowrap",
      render: (r) => (
        <div>
          <p>{formatDate(r.archivedAt)}</p>
          <p className="text-xs text-slate-500">by {r.archivedBy?.name ?? "—"}</p>
        </div>
      ),
    },
    {
      key: "reason",
      header: "Reason",
      render: (r) => <span className="line-clamp-2 max-w-72 text-slate-600">{r.archiveReason || "—"}</span>,
    },
    { key: "actions", header: "Actions", align: "right", render: actions },
  ];

  const renderMobileCard = (r) => (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        {recordCell(r)}
        {actions(r)}
      </div>
      <p className="text-xs text-slate-500">
        Archived {formatDate(r.archivedAt)} by {r.archivedBy?.name ?? "—"}
        {r.archiveReason && ` · ${r.archiveReason}`}
      </p>
    </div>
  );

  return (
    <>
      <PageHeader
        title="Archive"
        description="Archived records are hidden from every list, search and form. View them here or restore them."
      />

      <Card>
        <div className="space-y-3 border-b border-slate-200 p-4">
          <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Record type">
            {Object.entries(TYPES).map(([key, t]) => {
              const active = key === type;
              const Icon = t.icon;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => switchType(key)}
                  className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    active ? "bg-primary-600 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {t.label}
                  <span
                    className={`rounded-full px-1.5 text-xs tabular-nums ${active ? "bg-white/20" : "bg-slate-100 text-slate-600"}`}
                  >
                    {formatNumber(data?.counts?.[key] ?? 0)}
                  </span>
                </button>
              );
            })}
          </div>
          <Input
            aria-label={`Search archived ${config.label.toLowerCase()}`}
            type="search"
            icon={Search}
            placeholder={`Search archived ${config.label.toLowerCase()}…`}
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            className="max-w-md"
          />
        </div>

        {loading && !data ? (
          <TableSkeleton />
        ) : error && !data ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : records.length === 0 ? (
          <EmptyState
            icon={ArchiveIcon}
            title={filters.search ? "No archived records match" : `No archived ${config.label.toLowerCase()}`}
            description="Records you archive will appear here."
          />
        ) : (
          <div className={`transition-opacity ${loading ? "opacity-60" : ""}`} aria-busy={loading}>
            <Table
              columns={columns}
              rows={records}
              caption={`Archived ${config.label}`}
              renderMobileCard={renderMobileCard}
            />
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

      {/* View: the record's main fields and its archive history */}
      <Modal
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title={viewing ? config.title(viewing) : ""}
        description={viewing ? config.subtitle(viewing) : ""}
        footer={
          viewing && (
            <>
              {config.link && (
                <Button variant="secondary" to={config.link(viewing)}>
                  Open full record
                </Button>
              )}
              <Button
                icon={ArchiveRestore}
                onClick={() => {
                  // One dialog at a time: close "View" and ask for confirmation.
                  setToRestore(viewing);
                  setViewing(null);
                }}
              >
                Restore
              </Button>
            </>
          )
        }
      >
        {viewing && (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <Badge tone="warning">Archived</Badge>
              <span className="text-sm text-slate-600">
                {formatDateTime(viewing.archivedAt)} by {viewing.archivedBy?.name ?? "—"}
              </span>
            </div>
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {config.details(viewing).map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</dt>
                  <dd className="mt-0.5 text-sm text-slate-900">{value}</dd>
                </div>
              ))}
            </dl>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Archive history</h3>
              <ul className="mt-2 space-y-2">
                {viewing.archiveLog.map((entry) => (
                  <li
                    key={`${entry.action}-${entry.at}`}
                    className="rounded-lg bg-slate-50 px-3 py-2 text-sm ring-1 ring-slate-200"
                  >
                    <span className="font-medium text-slate-900">{entry.action}</span> by {entry.by?.name ?? "—"} ·{" "}
                    <span className="text-slate-500">{formatDateTime(entry.at)}</span>
                    {entry.reason && <p className="text-slate-600">{entry.reason}</p>}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(toRestore)}
        tone="success"
        title={`Restore ${toRestore ? config.title(toRestore) : ""}?`}
        message={
          type === "users"
            ? "The account will appear on the Users page again and the person can sign in (if the account is active)."
            : "It will appear again in the normal lists, searches and forms."
        }
        confirmLabel="Restore"
        loading={restoring}
        onConfirm={confirmRestore}
        onCancel={() => setToRestore(null)}
      />
      <p className="mt-4 text-xs text-slate-500">
        Tip: archived products keep their stock movement history, visible on the{" "}
        <Link to="/movements" className="font-medium text-primary-600 hover:text-primary-700">
          Stock Movements
        </Link>{" "}
        page.
      </p>
    </>
  );
}
