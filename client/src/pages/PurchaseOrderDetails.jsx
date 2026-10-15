import { ArrowLeft, Ban, CheckCircle2, ClipboardList, PackageCheck, XCircle } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { Link, useParams } from "react-router-dom";
import {
  approvePurchaseOrder,
  cancelPurchaseOrder,
  getPurchaseOrder,
  receivePurchaseOrder,
  rejectPurchaseOrder,
} from "../api/purchaseOrders";
import PoTimeline from "../components/purchase-orders/PoTimeline";
import Badge, { PoStatusBadge } from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import EmptyState from "../components/ui/EmptyState";
import ErrorState from "../components/ui/ErrorState";
import PageHeader from "../components/ui/PageHeader";
import ReasonDialog from "../components/ui/ReasonDialog";
import { PageLoader } from "../components/ui/Spinner";
import Table from "../components/ui/Table";
import useAuth from "../hooks/useAuth";
import useFetch from "../hooks/useFetch";
import { formatCurrency, formatDateTime, formatNumber } from "../utils/formatters";

/** Label/value pair in the summary card. */
function Detail({ label, children }) {
  return (
    <div>
      <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</dt>
      <dd className="mt-1 text-sm text-slate-900">{children}</dd>
    </div>
  );
}

/**
 * Purchase order details (all roles): summary, items, timeline and the
 * actions allowed for the current status and role:
 * - Requested: admin approves or rejects (with a reason); the requester or an admin can cancel.
 * - Approved: anyone marks it Received when the delivery arrives, which adds
 *   every item to stock as a "Purchase" stock-in movement.
 */
export default function PurchaseOrderDetails() {
  const { id } = useParams();
  const { user, isAdmin } = useAuth();
  const { data: po, loading, error, refetch } = useFetch(() => getPurchaseOrder(id).then((body) => body.data), [id]);
  // Which dialog is open: "approve" | "reject" | "cancel" | "receive" | null.
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);

  const backLink = (
    <Link
      to="/purchase-orders"
      className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700"
    >
      <ArrowLeft className="size-4" aria-hidden="true" /> Purchase orders
    </Link>
  );

  if (loading && !po) return <PageLoader label="Loading purchase order…" />;
  if (error && !po) {
    const notFound = error.response?.status === 404 || error.response?.status === 400;
    return (
      <>
        <PageHeader title="Purchase order">{backLink}</PageHeader>
        <Card>
          {notFound ? (
            <EmptyState
              icon={ClipboardList}
              title="Purchase order not found"
              action={<Button to="/purchase-orders">Back to purchase orders</Button>}
            />
          ) : (
            <ErrorState error={error} onRetry={refetch} />
          )}
        </Card>
      </>
    );
  }

  /** Runs one workflow action, then reloads the PO so status, buttons and timeline update together. */
  const act = async (request) => {
    setBusy(true);
    try {
      const body = await request();
      toast.success(body.message);
      setDialog(null);
      refetch();
    } catch {
      // Error toast comes from the axios interceptor (e.g. 409 if someone else acted first).
    } finally {
      setBusy(false);
    }
  };

  const isRequester = po.requestedBy?._id === user?._id;
  const open = !po.archived;
  const canApprove = open && isAdmin && po.status === "Requested";
  const canCancel = open && po.status === "Requested" && (isAdmin || isRequester);
  const canReceive = open && po.status === "Approved";
  const totalUnits = po.items.reduce((sum, item) => sum + item.quantity, 0);

  const itemColumns = [
    {
      key: "product",
      header: "Product",
      render: (item) => (
        <div className="min-w-44">
          <Link to={`/products/${item.product}`} className="font-medium text-slate-900 hover:text-primary-600">
            {item.productName}
          </Link>
          <p className="font-mono text-xs text-slate-500">{item.sku}</p>
        </div>
      ),
    },
    {
      key: "quantity",
      header: "Qty",
      align: "right",
      className: "whitespace-nowrap",
      render: (item) => (
        <span className="tabular-nums">
          {formatNumber(item.quantity)} <span className="text-slate-500">{item.unit}</span>
        </span>
      ),
    },
    { key: "unitCost", header: "Unit cost", align: "right", render: (item) => formatCurrency(item.unitCost) },
    {
      key: "lineTotal",
      header: "Line total",
      align: "right",
      render: (item) => <span className="font-semibold">{formatCurrency(item.lineTotal)}</span>,
    },
  ];

  const renderItemCard = (item) => (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <Link to={`/products/${item.product}`} className="block truncate font-medium text-slate-900">
          {item.productName}
        </Link>
        <p className="text-xs text-slate-500">
          {formatNumber(item.quantity)} {item.unit} × {formatCurrency(item.unitCost)}
        </p>
      </div>
      <span className="font-semibold text-slate-900">{formatCurrency(item.lineTotal)}</span>
    </div>
  );

  return (
    <>
      <PageHeader
        title={po.poNumber}
        description={`${po.supplierName} · ${formatCurrency(po.totalAmount)}`}
        actions={
          <>
            {canApprove && (
              <>
                <Button variant="success" icon={CheckCircle2} onClick={() => setDialog("approve")}>
                  Approve
                </Button>
                <Button variant="danger" icon={XCircle} onClick={() => setDialog("reject")}>
                  Reject
                </Button>
              </>
            )}
            {canReceive && (
              <Button variant="success" icon={PackageCheck} onClick={() => setDialog("receive")}>
                Mark as received
              </Button>
            )}
            {canCancel && (
              <Button variant="secondary" icon={Ban} onClick={() => setDialog("cancel")}>
                Cancel request
              </Button>
            )}
          </>
        }
      >
        {backLink}
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <PoStatusBadge status={po.status} />
          {po.archived && <Badge tone="neutral">Archived</Badge>}
        </div>
      </PageHeader>

      {po.status === "Requested" && !isAdmin && (
        <p className="mb-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-600/20">
          Waiting for an admin to approve this request.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Summary" bodyClassName="p-5">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-3">
              <Detail label="Supplier">
                {po.supplier?.name ?? po.supplierName}
                {po.supplier?.archived && <span className="text-slate-500"> (archived)</span>}
              </Detail>
              <Detail label="Contact">
                {po.supplier?.contactPerson || "—"}
                {po.supplier?.phone && <span className="block text-xs text-slate-500">{po.supplier.phone}</span>}
              </Detail>
              <Detail label="Total">
                <span className="font-semibold">{formatCurrency(po.totalAmount)}</span>
                <span className="block text-xs text-slate-500">
                  {po.items.length} item{po.items.length === 1 ? "" : "s"} · {formatNumber(totalUnits)} units
                </span>
              </Detail>
              <Detail label="Requested by">
                {po.requestedBy?.name ?? "—"}
                <span className="block text-xs text-slate-500">{formatDateTime(po.createdAt)}</span>
              </Detail>
              {po.approvedBy && (
                <Detail label="Approved by">
                  {po.approvedBy.name}
                  <span className="block text-xs text-slate-500">{formatDateTime(po.approvedAt)}</span>
                </Detail>
              )}
              {po.receivedBy && (
                <Detail label="Received by">
                  {po.receivedBy.name}
                  <span className="block text-xs text-slate-500">{formatDateTime(po.receivedAt)}</span>
                </Detail>
              )}
            </dl>
            {po.notes && (
              <p className="mt-5 border-t border-slate-100 pt-4 text-sm text-slate-600">
                <span className="font-medium text-slate-900">Notes: </span>
                {po.notes}
              </p>
            )}
            {po.status === "Rejected" && (
              <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-600/20">
                <span className="font-semibold">Rejected by {po.rejectedBy?.name ?? "an admin"}:</span>{" "}
                {po.rejectionReason}
              </p>
            )}
            {po.status === "Cancelled" && (
              <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-200">
                <span className="font-semibold">Cancelled by {po.cancelledBy?.name ?? "a user"}</span>
                {po.cancellationReason ? `: ${po.cancellationReason}` : "."}
              </p>
            )}
          </Card>

          <Card title="Items">
            <Table
              columns={itemColumns}
              rows={po.items}
              rowKey="sku"
              caption="Items"
              renderMobileCard={renderItemCard}
            />
            <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-5 py-3 text-sm">
              <span className="text-slate-600">Total&nbsp;</span>
              <span className="font-bold text-slate-900">{formatCurrency(po.totalAmount)}</span>
            </div>
          </Card>
        </div>

        <Card title="Timeline" description="Who did what, and when">
          <PoTimeline history={po.history} />
        </Card>
      </div>

      <ConfirmDialog
        open={dialog === "approve"}
        tone="success"
        title={`Approve ${po.poNumber}?`}
        message={`This approves buying ${formatNumber(totalUnits)} units from ${po.supplierName} for ${formatCurrency(po.totalAmount)}.`}
        confirmLabel="Approve"
        loading={busy}
        onConfirm={() => act(() => approvePurchaseOrder(po._id))}
        onCancel={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog === "receive"}
        tone="success"
        title={`Receive ${po.poNumber}?`}
        message={
          <>
            Confirm the delivery from <strong className="text-slate-900">{po.supplierName}</strong> has arrived. Each
            item is added to stock as a <strong className="text-slate-900">Purchase</strong> stock-in movement.
          </>
        }
        confirmLabel="Mark as received"
        loading={busy}
        onConfirm={() => act(() => receivePurchaseOrder(po._id))}
        onCancel={() => setDialog(null)}
      />
      <ReasonDialog
        open={dialog === "reject"}
        title={`Reject ${po.poNumber}?`}
        message="The requester will see your reason on the purchase order."
        placeholder="e.g. Price is higher than the last order; ask for a new quotation"
        confirmLabel="Reject"
        loading={busy}
        onConfirm={(reason) => act(() => rejectPurchaseOrder(po._id, reason))}
        onCancel={() => setDialog(null)}
      />
      <ReasonDialog
        open={dialog === "cancel"}
        title={`Cancel ${po.poNumber}?`}
        message="Cancelled requests stay in the history but can no longer be approved."
        required={false}
        confirmLabel="Cancel request"
        loading={busy}
        onConfirm={(reason) => act(() => cancelPurchaseOrder(po._id, reason))}
        onCancel={() => setDialog(null)}
      />
    </>
  );
}
