import mongoose from "mongoose";
import Counter from "../models/Counter.js";
import Product from "../models/Product.js";
import PurchaseOrder from "../models/PurchaseOrder.js";
import Supplier from "../models/Supplier.js";
import { revertStockIns, stockIn } from "../services/stockService.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { PO_STATUSES } from "../utils/constants.js";
import { toLocalDateString } from "../utils/dates.js";
import { escapeRegex, getPagination, paginated } from "../utils/helpers.js";

const ACTIVE = { archived: { $ne: true } };

/** User fields shown for every person on a PO. */
const PEOPLE = ["requestedBy", "approvedBy", "rejectedBy", "receivedBy", "cancelledBy"];

/** Loads one PO with everything the details page needs. */
const findDetailed = (id) =>
  PurchaseOrder.findById(id)
    .populate("supplier", "name contactPerson phone email archived")
    .populate(PEOPLE.map((path) => ({ path, select: "name role" })))
    .populate("history.by", "name role");

/** "PO-2026-0042": year (Manila time) plus an atomic, never-repeating sequence number. */
const nextPoNumber = async () => {
  const seq = await Counter.next("purchaseOrder");
  return `PO-${toLocalDateString(new Date()).slice(0, 4)}-${String(seq).padStart(4, "0")}`;
};

/**
 * Moves a PO from one status to the next in a single atomic update that only
 * matches while the PO is still in `from` status (and not archived). If two
 * people click "Approve" at the same time, only the first one succeeds; the
 * second gets a clear 409 instead of a double approval.
 *
 * @param {object} params
 * @param {string} params.id
 * @param {string} params.from Required current status.
 * @param {string} params.to New status.
 * @param {object} params.user The signed-in user.
 * @param {Record<string, unknown>} [params.set] Extra fields to set.
 * @param {string} [params.note] Timeline note (e.g. the rejection reason).
 * @param {Record<string, unknown>} [params.extraFilter] Extra match conditions.
 * @param {string} params.verb Used in the 409 message ("approved", "received", ...).
 */
const transition = async ({ id, from, to, user, set = {}, note = "", extraFilter = {}, verb }) => {
  const po = await PurchaseOrder.findOneAndUpdate(
    { _id: id, status: from, ...ACTIVE, ...extraFilter },
    { $set: { status: to, ...set }, $push: { history: { action: to, by: user._id, at: new Date(), note } } },
    { returnDocument: "after" }
  );
  if (po) return po;

  const existing = await PurchaseOrder.findById(id).select("status archived requestedBy poNumber");
  if (!existing) throw ApiError.notFound("Purchase order not found");
  if (existing.archived) throw ApiError.conflict(`${existing.poNumber} is archived`);
  // Still in the right status, so the extra filter failed: a staff member cancelling someone else's request.
  if (existing.status === from) {
    throw ApiError.forbidden("Only the person who requested this purchase order or an admin can cancel it");
  }
  throw ApiError.conflict(`Only ${from} purchase orders can be ${verb}. ${existing.poNumber} is ${existing.status}.`);
};

/**
 * GET /api/purchase-orders?status=&search=&supplier=&page=&limit=
 * Newest first. `counts` (per status, ignoring the status filter) feeds the
 * filter tabs. Archived POs are excluded; they appear only on the Archive page.
 */
export const getPurchaseOrders = asyncHandler(async (req, res) => {
  const { status, search, supplier } = req.query;
  const base = { ...ACTIVE };

  if (search?.trim()) {
    const pattern = new RegExp(escapeRegex(search.trim()), "i");
    base.$or = [{ poNumber: pattern }, { supplierName: pattern }, { "items.productName": pattern }];
  }
  if (supplier) {
    if (!mongoose.isValidObjectId(supplier)) throw ApiError.badRequest("Invalid supplier ID");
    base.supplier = new mongoose.Types.ObjectId(String(supplier));
  }

  const filter = { ...base };
  if (status) {
    if (!PO_STATUSES.includes(status)) throw ApiError.badRequest(`Status must be one of: ${PO_STATUSES.join(", ")}`);
    filter.status = status;
  }

  const pagination = getPagination(req.query, 10);
  const [orders, total, countRows] = await Promise.all([
    PurchaseOrder.find(filter)
      .select("-history")
      .populate("requestedBy", "name")
      .sort({ createdAt: -1, _id: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit),
    PurchaseOrder.countDocuments(filter),
    PurchaseOrder.aggregate([{ $match: base }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
  ]);

  const counts = Object.fromEntries(PO_STATUSES.map((s) => [s, 0]));
  for (const row of countRows) counts[row._id] = row.count;

  res.json({ ...paginated(orders, total, pagination), counts });
});

/** GET /api/purchase-orders/:id: the PO with people, supplier and timeline. */
export const getPurchaseOrder = asyncHandler(async (req, res) => {
  const po = await findDetailed(req.params.id);
  if (!po) throw ApiError.notFound("Purchase order not found");
  res.json({ success: true, data: po });
});

/**
 * POST /api/purchase-orders (any signed-in user)
 * Creates a PO in "Requested" status. Supplier and products must exist and
 * be active; names, SKUs and units are copied onto the PO as snapshots.
 */
export const createPurchaseOrder = asyncHandler(async (req, res) => {
  const { supplier: supplierId, items, notes } = req.body;

  const supplier = await Supplier.findOne({ _id: supplierId, ...ACTIVE }).select("name");
  if (!supplier) {
    throw ApiError.badRequest("Selected supplier does not exist or is archived", [
      { field: "supplier", message: "Please choose an active supplier" },
    ]);
  }

  const productIds = items.map((item) => item.product);
  if (new Set(productIds).size !== productIds.length) {
    throw ApiError.badRequest("Each product can appear only once on a purchase order", [
      { field: "items", message: "Each product can appear only once" },
    ]);
  }

  const products = await Product.find({ _id: { $in: productIds }, ...ACTIVE }).select("name sku unit");
  const byId = new Map(products.map((p) => [String(p._id), p]));
  const missing = items.findIndex((item) => !byId.has(String(item.product)));
  if (missing !== -1) {
    throw ApiError.badRequest("A selected product does not exist or is archived", [
      { field: `items[${missing}].product`, message: "Please choose an active product" },
    ]);
  }

  const po = await PurchaseOrder.create({
    poNumber: await nextPoNumber(),
    supplier: supplier._id,
    supplierName: supplier.name,
    items: items.map(({ product, quantity, unitCost }) => {
      const p = byId.get(String(product));
      return { product: p._id, productName: p.name, sku: p.sku, unit: p.unit, quantity, unitCost };
    }),
    notes: notes ?? "",
    requestedBy: req.user._id,
    history: [{ action: "Requested", by: req.user._id, at: new Date(), note: notes ?? "" }],
  });

  res.status(201).json({ success: true, data: await findDetailed(po._id), message: `${po.poNumber} requested` });
});

/** PATCH /api/purchase-orders/:id/approve (admin): Requested → Approved. */
export const approvePurchaseOrder = asyncHandler(async (req, res) => {
  const po = await transition({
    id: req.params.id,
    from: "Requested",
    to: "Approved",
    user: req.user,
    set: { approvedBy: req.user._id, approvedAt: new Date() },
    note: req.body?.note ?? "",
    verb: "approved",
  });
  res.json({ success: true, data: await findDetailed(po._id), message: `${po.poNumber} approved` });
});

/** PATCH /api/purchase-orders/:id/reject (admin): Requested → Rejected, with a required reason. */
export const rejectPurchaseOrder = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  const po = await transition({
    id: req.params.id,
    from: "Requested",
    to: "Rejected",
    user: req.user,
    set: { rejectedBy: req.user._id, rejectedAt: new Date(), rejectionReason: reason },
    note: reason,
    verb: "rejected",
  });
  res.json({ success: true, data: await findDetailed(po._id), message: `${po.poNumber} rejected` });
});

/**
 * PATCH /api/purchase-orders/:id/cancel: Requested → Cancelled.
 * Staff can cancel only their own requests; admins can cancel any request.
 */
export const cancelPurchaseOrder = asyncHandler(async (req, res) => {
  const reason = req.body?.reason ?? "";
  const po = await transition({
    id: req.params.id,
    from: "Requested",
    to: "Cancelled",
    user: req.user,
    set: { cancelledBy: req.user._id, cancelledAt: new Date(), cancellationReason: reason },
    note: reason,
    extraFilter: req.user.role === "admin" ? {} : { requestedBy: req.user._id },
    verb: "cancelled",
  });
  res.json({ success: true, data: await findDetailed(po._id), message: `${po.poNumber} cancelled` });
});

/**
 * PATCH /api/purchase-orders/:id/receive (admin or staff): Approved → Received.
 *
 * The status is claimed first (atomically), then each line is added to stock
 * with the same atomic stock-in used by the Stock Movements page, recording
 * one IN movement per item (reason "Purchase", linked to the PO). If any line
 * fails, the lines already added are reverted and the PO goes back to
 * Approved, so stock and PO status never disagree.
 */
export const receivePurchaseOrder = asyncHandler(async (req, res) => {
  const receivedAt = new Date();
  const po = await transition({
    id: req.params.id,
    from: "Approved",
    to: "Received",
    user: req.user,
    set: { receivedBy: req.user._id, receivedAt },
    note: req.body?.note ?? "",
    verb: "received",
  });

  const applied = [];
  try {
    for (const item of po.items) {
      applied.push(
        await stockIn({
          productId: item.product,
          quantity: item.quantity,
          reason: "Purchase",
          note: `Received ${po.poNumber} from ${po.supplierName}`,
          userId: req.user._id,
          purchaseOrder: po,
        })
      );
    }
  } catch (error) {
    await revertStockIns(applied);
    await PurchaseOrder.updateOne(
      { _id: po._id },
      { $set: { status: "Approved", receivedBy: null, receivedAt: null }, $pop: { history: 1 } }
    );
    throw error;
  }

  res.json({
    success: true,
    data: await findDetailed(po._id),
    message: `${po.poNumber} received: ${applied.length} item${applied.length === 1 ? "" : "s"} added to stock`,
  });
});
