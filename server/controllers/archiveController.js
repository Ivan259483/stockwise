/**
 * Archive module: archive (soft delete), restore and list archived records for
 * products, suppliers, users and purchase orders. Admin only.
 *
 * One table of per-type rules keeps the four record types consistent: what to
 * show, what to search, and when archiving must be refused.
 */
import Product from "../models/Product.js";
import PurchaseOrder from "../models/PurchaseOrder.js";
import Supplier from "../models/Supplier.js";
import User from "../models/User.js";
import { ACTIVE_FILTER } from "../models/plugins/archivable.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { CLOSED_PO_STATUSES, OPEN_PO_STATUSES } from "../utils/constants.js";
import { escapeRegex, getPagination, paginated } from "../utils/helpers.js";

/** Lists up to three PO numbers for an error message: "PO-2026-0001, PO-2026-0004 and 2 more". */
const describePos = (orders) => {
  const numbers = orders.map((o) => o.poNumber);
  const shown = numbers.slice(0, 3).join(", ");
  return numbers.length > 3 ? `${shown} and ${numbers.length - 3} more` : shown;
};

/** Open (Requested/Approved) POs matching `filter`, oldest first. */
const findOpenPos = (filter) =>
  PurchaseOrder.find({ ...filter, ...ACTIVE_FILTER, status: { $in: OPEN_PO_STATUSES } })
    .select("poNumber")
    .sort({ createdAt: 1 });

/**
 * Per-type rules.
 * - `label(doc)`: name used in messages.
 * - `search`: fields matched by ?search=.
 * - `select` / `populate`: what the Archive page shows.
 * - `canArchive(doc, req)`: throws an ApiError when archiving must be refused.
 */
export const ARCHIVE_TYPES = {
  products: {
    model: Product,
    noun: "Product",
    label: (doc) => doc.name,
    search: ["name", "sku"],
    select: "-image",
    populate: [{ path: "category", select: "name" }],
    canArchive: async (doc) => {
      const open = await findOpenPos({ "items.product": doc._id });
      if (open.length) {
        throw ApiError.conflict(
          `Cannot archive "${doc.name}": it is on open purchase order(s) ${describePos(open)}. Receive, reject or cancel them first.`
        );
      }
    },
  },
  suppliers: {
    model: Supplier,
    noun: "Supplier",
    label: (doc) => doc.name,
    search: ["name", "contactPerson", "email"],
    canArchive: async (doc) => {
      const open = await findOpenPos({ supplier: doc._id });
      if (open.length) {
        throw ApiError.conflict(
          `Cannot archive "${doc.name}": it has open purchase order(s) ${describePos(open)}. Receive, reject or cancel them first.`
        );
      }
    },
  },
  users: {
    model: User,
    noun: "User",
    label: (doc) => doc.name,
    search: ["name", "email"],
    canArchive: async (doc, req) => {
      if (String(doc._id) === String(req.user._id)) throw ApiError.badRequest("You cannot archive your own account");
    },
  },
  "purchase-orders": {
    model: PurchaseOrder,
    noun: "Purchase order",
    label: (doc) => doc.poNumber,
    search: ["poNumber", "supplierName"],
    select: "-history",
    populate: [{ path: "requestedBy", select: "name" }],
    canArchive: async (doc) => {
      if (!CLOSED_PO_STATUSES.includes(doc.status)) {
        throw ApiError.conflict(
          `Only received, rejected or cancelled purchase orders can be archived. ${doc.poNumber} is ${doc.status}.`
        );
      }
    },
    // POs also show archive/restore on their own timeline.
    timeline: true,
  },
};

const typeOf = (type) => {
  const config = ARCHIVE_TYPES[type];
  if (!config) throw ApiError.notFound(`Unknown archive type "${type}"`);
  return config;
};

/**
 * Builds the PATCH /:id/archive handler for one type.
 * The update matches only a record that is not archived yet, so archiving
 * twice returns 409 instead of overwriting who archived it and when.
 *
 * @param {keyof typeof ARCHIVE_TYPES} type
 */
export const archiveRecord = (type) =>
  asyncHandler(async (req, res) => {
    const config = typeOf(type);
    const doc = await config.model.findById(req.params.id);
    if (!doc) throw ApiError.notFound(`${config.noun} not found`);
    if (doc.archived) throw ApiError.conflict(`${config.label(doc)} is already archived`);

    await config.canArchive(doc, req);

    const now = new Date();
    const { reason } = req.body;
    const update = {
      $set: { archived: true, archivedAt: now, archivedBy: req.user._id, archiveReason: reason },
      $push: {
        archiveLog: { action: "Archived", by: req.user._id, at: now, reason },
        ...(config.timeline ? { history: { action: "Archived", by: req.user._id, at: now, note: reason } } : {}),
      },
    };
    const archived = await config.model.findOneAndUpdate({ _id: doc._id, ...ACTIVE_FILTER }, update, {
      returnDocument: "after",
    });
    if (!archived) throw ApiError.conflict(`${config.label(doc)} is already archived`);

    res.json({ success: true, data: archived, message: `${config.label(doc)} archived` });
  });

/**
 * Builds the PATCH /:id/restore handler for one type: the record returns to
 * every active list. The archive fields are cleared; archiveLog keeps the history.
 *
 * @param {keyof typeof ARCHIVE_TYPES} type
 */
export const restoreRecord = (type) =>
  asyncHandler(async (req, res) => {
    const config = typeOf(type);
    const now = new Date();
    const restored = await config.model.findOneAndUpdate(
      { _id: req.params.id, archived: true },
      {
        $set: { archived: false, archivedAt: null, archivedBy: null, archiveReason: "" },
        $push: {
          archiveLog: { action: "Restored", by: req.user._id, at: now },
          ...(config.timeline ? { history: { action: "Restored", by: req.user._id, at: now } } : {}),
        },
      },
      { returnDocument: "after" }
    );

    if (!restored) {
      const exists = await config.model.exists({ _id: req.params.id });
      if (!exists) throw ApiError.notFound(`${config.noun} not found`);
      throw ApiError.conflict(`${config.noun} is not archived`);
    }

    res.json({ success: true, data: restored, message: `${config.label(restored)} restored` });
  });

/**
 * GET /api/archive/:type?search=&page=&limit=
 * Archived records of one type, most recently archived first, with who
 * archived them. `counts` (per type) feeds the tab badges.
 */
export const getArchived = asyncHandler(async (req, res) => {
  const config = typeOf(req.params.type);
  const filter = { archived: true };

  const search = req.query.search?.trim();
  if (search) {
    const pattern = new RegExp(escapeRegex(search), "i");
    filter.$or = config.search.map((field) => ({ [field]: pattern }));
  }

  const pagination = getPagination(req.query, 10);
  let query = config.model
    .find(filter)
    .populate("archivedBy", "name")
    .populate("archiveLog.by", "name")
    .sort({ archivedAt: -1, _id: -1 })
    .skip(pagination.skip)
    .limit(pagination.limit);
  if (config.select) query = query.select(config.select);
  for (const populate of config.populate ?? []) query = query.populate(populate);

  const types = Object.entries(ARCHIVE_TYPES);
  const [records, total, ...typeCounts] = await Promise.all([
    query,
    config.model.countDocuments(filter),
    ...types.map(([, { model }]) => model.countDocuments({ archived: true })),
  ]);
  const counts = Object.fromEntries(types.map(([key], i) => [key, typeCounts[i]]));

  res.json({ ...paginated(records, total, pagination), counts });
});
