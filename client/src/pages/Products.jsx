import { Eye, FilterX, PackageSearch, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { getCategories } from "../api/categories";
import { deleteProduct, getProducts } from "../api/products";
import { StockStatusBadge } from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import EmptyState from "../components/ui/EmptyState";
import ErrorState from "../components/ui/ErrorState";
import Input from "../components/ui/Input";
import PageHeader from "../components/ui/PageHeader";
import Pagination from "../components/ui/Pagination";
import Select from "../components/ui/Select";
import Table, { TableSkeleton } from "../components/ui/Table";
import useAuth from "../hooks/useAuth";
import useDebounce from "../hooks/useDebounce";
import useFetch from "../hooks/useFetch";
import useUrlFilters from "../hooks/useUrlFilters";
import { SORT_OPTIONS, STATUS_OPTIONS } from "../utils/constants";
import { formatCurrency, formatNumber } from "../utils/formatters";

const PAGE_SIZE = 10;
const DEFAULT_FILTERS = { search: "", category: "", status: "", sort: "name", page: "1" };

/**
 * Product catalog page (all roles; add, edit and delete for admins only).
 *
 * Filters, sort and page live in the URL query string, so a refresh keeps them
 * and the dashboard can link straight to e.g. ?status=low_stock. The search box
 * is debounced (300 ms) so the API is queried once the user pauses typing,
 * not on every keystroke.
 */
export default function Products() {
  const { isAdmin } = useAuth();
  const [filters, setFilters] = useUrlFilters(DEFAULT_FILTERS);
  // The input keeps its own text; only the debounced value is written to the URL.
  const [searchText, setSearchText] = useState(filters.search);
  const debouncedSearch = useDebounce(searchText.trim(), 300);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Push the debounced search text into the URL (which triggers the fetch).
  useEffect(() => {
    if (debouncedSearch !== filters.search) setFilters({ search: debouncedSearch });
  }, [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  // Categories fill the filter dropdown; products reload whenever a filter in the URL changes.
  const { data: categories } = useFetch(() => getCategories().then((body) => body.data));
  const { data, loading, error, refetch } = useFetch(
    () => getProducts({ ...filters, limit: PAGE_SIZE }),
    [filters.search, filters.category, filters.status, filters.sort, filters.page]
  );

  const products = data?.data ?? [];
  const hasFilters = Boolean(filters.search || filters.category || filters.status);

  const clearFilters = () => {
    setSearchText("");
    setFilters({ search: "", category: "", status: "" });
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteProduct(toDelete._id);
      toast.success(`"${toDelete.name}" deleted`);
      setToDelete(null);
      // Step back a page if we just removed the last item on this page.
      if (products.length === 1 && data.page > 1) setFilters({ page: data.page - 1 });
      else refetch();
    } catch {
      // The API error is already shown as a toast by the axios interceptor.
    } finally {
      setDeleting(false);
    }
  };

  // Row actions are shared by the desktop table and the mobile cards so both stay in sync.
  const actions = (product) => (
    <div className="flex items-center justify-end gap-1">
      <Button
        to={`/products/${product._id}`}
        variant="ghost"
        size="icon"
        icon={Eye}
        aria-label={`View ${product.name}`}
      />
      {isAdmin && (
        <>
          <Button
            to={`/products/${product._id}/edit`}
            variant="ghost"
            size="icon"
            icon={Pencil}
            aria-label={`Edit ${product.name}`}
          />
          <Button
            variant="ghost"
            size="icon"
            icon={Trash2}
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={() => setToDelete(product)}
            aria-label={`Delete ${product.name}`}
          />
        </>
      )}
    </div>
  );

  // Desktop table; "Stock value" is hidden below the lg breakpoint to keep the row readable.
  const columns = [
    {
      key: "name",
      header: "Product",
      render: (p) => (
        <div className="min-w-48">
          <Link to={`/products/${p._id}`} className="font-medium text-slate-900 hover:text-primary-600">
            {p.name}
          </Link>
          <p className="font-mono text-xs text-slate-500">{p.sku}</p>
        </div>
      ),
    },
    { key: "category", header: "Category", render: (p) => p.category?.name ?? "—" },
    {
      key: "quantity",
      header: "Qty",
      align: "right",
      render: (p) => (
        <span className="font-semibold whitespace-nowrap tabular-nums">
          {formatNumber(p.quantity)} <span className="font-normal text-slate-500">{p.unit}</span>
        </span>
      ),
    },
    { key: "price", header: "Price", align: "right", render: (p) => formatCurrency(p.sellingPrice) },
    {
      key: "value",
      header: "Stock value",
      align: "right",
      className: "hidden lg:table-cell",
      render: (p) => formatCurrency(p.stockValue),
    },
    { key: "status", header: "Status", render: (p) => <StockStatusBadge status={p.stockStatus} /> },
    { key: "actions", header: "Actions", align: "right", render: actions },
  ];

  // Phones get one card per product instead of a wide table.
  const renderMobileCard = (p) => (
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <Link to={`/products/${p._id}`} className="font-medium text-slate-900 hover:text-primary-600">
          {p.name}
        </Link>
        <p className="font-mono text-xs text-slate-500">
          {p.sku} · {p.category?.name ?? "—"}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <StockStatusBadge status={p.stockStatus} />
          <span className="font-semibold tabular-nums">
            {formatNumber(p.quantity)} {p.unit}
          </span>
          <span className="text-slate-500">{formatCurrency(p.sellingPrice)}</span>
        </div>
      </div>
      {actions(p)}
    </div>
  );

  const categoryOptions = (categories ?? []).map((c) => ({ value: c._id, label: c.name }));

  return (
    <>
      <PageHeader
        title="Products"
        description={
          data ? `${formatNumber(data.total)} product${data.total === 1 ? "" : "s"} found` : "Your product catalogue"
        }
        actions={
          isAdmin && (
            <Button to="/products/new" icon={Plus}>
              Add product
            </Button>
          )
        }
      />

      <Card>
        {/* Filter bar: search, category, stock status and sort */}
        <div className="grid gap-3 border-b border-slate-200 p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          <Input
            aria-label="Search products"
            type="search"
            icon={Search}
            placeholder="Search by name or SKU…"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            className="sm:col-span-2 lg:col-span-1"
          />
          <Select
            aria-label="Filter by category"
            value={filters.category}
            onChange={(event) => setFilters({ category: event.target.value })}
            options={categoryOptions}
            placeholder="All categories"
          />
          <Select
            aria-label="Filter by stock status"
            value={filters.status}
            onChange={(event) => setFilters({ status: event.target.value })}
            options={STATUS_OPTIONS.filter((o) => o.value)}
            placeholder="All statuses"
          />
          <Select
            aria-label="Sort products"
            value={filters.sort}
            onChange={(event) => setFilters({ sort: event.target.value })}
            options={SORT_OPTIONS}
          />
        </div>

        {/* States in order: first load, failed load, nothing found (with or without filters), results */}
        {loading && !data ? (
          <TableSkeleton rows={PAGE_SIZE} />
        ) : error && !data ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : products.length === 0 ? (
          hasFilters ? (
            <EmptyState
              icon={PackageSearch}
              title="No matching products"
              description="Try a different search term or clear the filters."
              action={
                <Button variant="secondary" icon={FilterX} onClick={clearFilters}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={PackageSearch}
              title="No products yet"
              description={
                isAdmin ? "Add your first product to start tracking stock." : "An admin has not added any products yet."
              }
              action={
                isAdmin && (
                  <Button to="/products/new" icon={Plus}>
                    Add product
                  </Button>
                )
              }
            />
          )
        ) : (
          <div className={`transition-opacity ${loading ? "opacity-60" : ""}`} aria-busy={loading}>
            <Table columns={columns} rows={products} caption="Products" renderMobileCard={renderMobileCard} />
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

      {/* Deleting cannot be undone, so it always asks first */}
      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete product?"
        message={
          <>
            <strong className="text-slate-900">{toDelete?.name}</strong> will be removed from your catalogue. Its stock
            movement history is kept for your records.
          </>
        }
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}
