/**
 * Resets the database and loads PRESENTATION data for the sample client,
 * Santos Family Hardware (a family-owned hardware store).
 *
 * The data is produced by a small day-by-day simulation of the last 45 days,
 * so every number is consistent:
 * - every product starts with an "Opening stock" movement;
 * - sales (stock OUT) happen every business day and never exceed the stock;
 * - when a product falls to its reorder level, the purchasing clerk requests a
 *   PO, an owner approves it and the receiving staff receive it 1-3 days later,
 *   which records one "Purchase" stock IN per item, linked to the PO;
 * - each product's final quantity equals the sum of its movements.
 * On top of that it adds Requested, Approved, Rejected and Cancelled POs for
 * the live demo, and a few archived records (user, supplier, products, POs).
 * A fixed random seed makes every run produce the same data.
 *
 * Accounts use a made-up domain (DEMO_EMAIL_DOMAIN, checked with nslookup)
 * except one staff account that uses the presenter's own email so Password
 * Recovery can be demonstrated live.
 *
 * Usage: npm run seed                 (local database from server/.env)
 *        npm run seed -- --remote-ok  (required for a non-local database, e.g. Atlas)
 * WARNING: deletes all existing StockWise data in that database.
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import Category from "../models/Category.js";
import Counter from "../models/Counter.js";
import Product from "../models/Product.js";
import PurchaseOrder from "../models/PurchaseOrder.js";
import StockMovement from "../models/StockMovement.js";
import Supplier from "../models/Supplier.js";
import User from "../models/User.js";
import { DEMO_EMAIL_DOMAIN } from "../utils/constants.js";
import { startOfLocalDay, toLocalDateString } from "../utils/dates.js";

dotenv.config({ quiet: true });

const HOUR_MS = 60 * 60 * 1000;
const DAYS = 45;
/** Automatic reordering stops this many days before today, so some items are low for the demo. */
const REORDER_CUTOFF_DAY = 5;
/** The presenter's own mailbox (one staff account) for the Password Recovery demo. */
const PRESENTER_EMAIL = "ivantadena21@gmail.com";

const demo = (local) => `${local}@${DEMO_EMAIL_DOMAIN}`;

// ---------------------------------------------------------------- Master data

/** key, name, email, role, job (used only to pick who does what) */
const USERS = [
  ["roberto", "Roberto Santos", demo("roberto.santos"), "admin", "owner"],
  ["maricel", "Maricel Santos", demo("maricel.santos"), "admin", "owner"],
  ["lorna", "Lorna Mercado", demo("lorna.mercado"), "staff", "purchasing"],
  ["jomar", "Jomar Dizon", demo("jomar.dizon"), "staff", "warehouse"],
  ["kristine", "Kristine Mae Villanueva", demo("kristine.villanueva"), "staff", "cashier"],
  ["angelica", "Angelica Ramos", demo("angelica.ramos"), "staff", "cashier"],
  ["rodel", "Rodel Bautista", demo("rodel.bautista"), "staff", "warehouse"],
  ["ferdinand", "Ferdinand Garcia", demo("ferdinand.garcia"), "staff", "receiving"],
  ["paolo", "Paolo Navarro", demo("paolo.navarro"), "staff", "sales"],
  ["ivan", "Ivan Tadena", PRESENTER_EMAIL, "staff", "sales"],
  // Archived below (resigned), so the Archive page has a user to show.
  ["ramil", "Ramil Ocampo", demo("ramil.ocampo"), "staff", "sales"],
];
const PASSWORDS = { admin: "Admin123!", staff: "Staff123!" };

const CATEGORIES = [
  ["Hand Tools", "Hammers, measuring tapes, wrenches, saws and screwdrivers"],
  ["Power Tools", "Drills, grinders and their accessories"],
  ["Electrical", "Wires, bulbs, outlets, breakers and extension cords"],
  ["Plumbing", "PVC pipes and fittings, faucets, sealants"],
  ["Paints & Coatings", "Latex and enamel paints, thinners, brushes and rollers"],
  ["Construction Materials", "Cement, rebar, plywood and hollow blocks"],
  ["Fasteners & Hardware", "Nails, screws and padlocks"],
  ["Safety & PPE", "Gloves, goggles and other protective gear"],
];

const supplierEmail = (local) => `${local}@suppliers.${DEMO_EMAIL_DOMAIN}`;
/** key, name, contact person, phone, email, address */
const SUPPLIERS = [
  [
    "binondo",
    "Binondo Hardware Trading",
    "Ramon Dela Cruz",
    "0917 555 0142",
    supplierEmail("binondo"),
    "Juan Luna St., Binondo, Manila",
  ],
  [
    "mandaue",
    "Mandaue Builders Supply",
    "Teresita Lim",
    "0922 555 0178",
    supplierEmail("mandaue"),
    "A.C. Cortes Ave., Mandaue City, Cebu",
  ],
  [
    "rizal",
    "Rizal Electrical Distributors",
    "Carlo Mendoza",
    "0918 555 0193",
    supplierEmail("rizal"),
    "Ortigas Ave. Extension, Cainta, Rizal",
  ],
  [
    "quezon",
    "Quezon Paint Center",
    "Ana Reyes",
    "(02) 8555 0127",
    supplierEmail("quezon"),
    "E. Rodriguez Sr. Ave., Quezon City",
  ],
  [
    "laguna",
    "Laguna Plumbing Depot",
    "Edwin Castillo",
    "0927 555 0164",
    supplierEmail("laguna"),
    "National Highway, Calamba, Laguna",
  ],
  [
    "pampanga",
    "Pampanga Steel & Lumber",
    "Gloria Manalo",
    "0916 555 0119",
    supplierEmail("pampanga"),
    "MacArthur Highway, San Fernando, Pampanga",
  ],
  // Archived below; its products and one old PO are archived too.
  [
    "bulacan",
    "Bulacan Hardware Wholesale",
    "Nestor Cruz",
    "0915 555 0108",
    supplierEmail("bulacan"),
    "Paseo del Congreso, Malolos, Bulacan",
  ],
];

/**
 * name, sku, category index, supplier key, unit, cost, price, reorder level,
 * opening quantity, average units sold per day, usual order quantity
 */
const PRODUCTS = [
  ["Claw Hammer 16 oz", "HT-HAM-016", 0, "binondo", "pcs", 185, 260, 10, 30, 0.8, 24],
  ["Steel Tape Measure 5 m", "HT-TAP-005", 0, "binondo", "pcs", 95, 145, 15, 40, 1.2, 36],
  ["Screwdriver Set 6-pc", "HT-SCR-006", 0, "binondo", "box", 210, 320, 8, 15, 0.4, 12],
  ['Adjustable Wrench 10"', "HT-WRN-010", 0, "binondo", "pcs", 230, 340, 5, 12, 0.3, 10],
  ['Hacksaw Frame 12"', "HT-HKS-012", 0, "binondo", "pcs", 165, 240, 6, 14, 0.3, 12],
  ["Electric Drill 13 mm 650W", "PW-DRL-650", 1, "rizal", "pcs", 1850, 2490, 3, 6, 0.12, 5],
  ['Angle Grinder 4" 710W', "PW-GRD-004", 1, "rizal", "pcs", 1450, 1990, 3, 6, 0.12, 5],
  ['Metal Cutting Disc 4"', "PW-DSC-004", 1, "rizal", "pcs", 28, 45, 30, 100, 3, 100],
  ["THHN Wire 2.0 mm² (75 m)", "EL-WIR-020", 2, "rizal", "box", 2150, 2750, 5, 10, 0.25, 8],
  ["LED Bulb 9W Daylight", "EL-LED-009", 2, "rizal", "pcs", 65, 99, 30, 120, 4, 100],
  ["Convenience Outlet Duplex", "EL-OUT-002", 2, "rizal", "pcs", 48, 75, 20, 50, 1.5, 50],
  ["Extension Cord 4-Gang 3 m", "EL-EXT-004", 2, "rizal", "pcs", 260, 380, 8, 20, 0.5, 15],
  ["Circuit Breaker 20A Plug-in", "EL-CBR-020", 2, "rizal", "pcs", 285, 395, 6, 15, 0.35, 12],
  ['PVC Pipe 1/2" x 3 m', "PL-PVC-050", 3, "laguna", "pcs", 85, 125, 20, 60, 2, 60],
  ['Teflon Tape 1/2"', "PL-TEF-050", 3, "laguna", "pcs", 12, 20, 25, 80, 3, 100],
  ['Brass Faucet 1/2"', "PL-FAU-050", 3, "laguna", "pcs", 180, 265, 6, 15, 0.4, 12],
  ['PVC Elbow 1/2" 90°', "PL-ELB-050", 3, "laguna", "pcs", 9, 15, 40, 120, 4, 150],
  ["PVC Solvent Cement 100 cc", "PL-SOL-100", 3, "laguna", "pcs", 55, 85, 12, 30, 0.8, 24],
  ["Latex Paint White 4 L", "PA-LAT-004", 4, "quezon", "pcs", 620, 795, 6, 16, 0.5, 12],
  ["Quick-Dry Enamel Black 1 L", "PA-QDE-001", 4, "quezon", "pcs", 260, 345, 6, 14, 0.4, 12],
  ['Paint Brush 2"', "PA-BRS-002", 4, "quezon", "pcs", 35, 55, 15, 45, 1.3, 48],
  ["Paint Thinner 1 L", "PA-THN-001", 4, "quezon", "L", 95, 135, 10, 30, 0.9, 24],
  ['Paint Roller 7" with Tray', "PA-ROL-007", 4, "quezon", "pcs", 145, 210, 6, 15, 0.4, 12],
  ["Portland Cement 40 kg", "CM-CEM-040", 5, "mandaue", "pcs", 245, 285, 30, 80, 6, 100],
  ["Deformed Bar 10 mm x 6 m", "CM-RBR-010", 5, "pampanga", "pcs", 195, 245, 25, 60, 3, 80],
  ['Plywood 1/4" 4x8 ft', "CM-PLY-025", 5, "pampanga", "pcs", 420, 520, 10, 25, 0.8, 20],
  ['Concrete Hollow Block 4"', "CM-CHB-004", 5, "mandaue", "pcs", 12, 16, 100, 400, 25, 500],
  ['Common Wire Nails 2"', "FH-NAI-002", 6, "binondo", "kg", 75, 105, 10, 30, 1.5, 40],
  ['Concrete Nails 2"', "FH-CNA-002", 6, "binondo", "kg", 95, 130, 8, 20, 0.6, 20],
  ['Wood Screws #8 x 1" (100 pcs)', "FH-WSC-100", 6, "binondo", "box", 85, 125, 10, 25, 0.6, 24],
  ["Brass Padlock 40 mm", "FH-PAD-040", 6, "binondo", "pcs", 165, 235, 6, 15, 0.35, 12],
  ["Cotton Work Gloves", "SP-GLV-001", 7, "binondo", "pack", 25, 40, 20, 60, 2, 60],
  ["Safety Goggles Clear", "SP-GOG-001", 7, "binondo", "pcs", 55, 85, 8, 20, 0.4, 24],
  // Archived on ARCHIVE_DAY together with their supplier (no longer sold).
  ["Incandescent Bulb 60W", "EL-INC-060", 2, "bulacan", "pcs", 22, 35, 10, 20, 0.4, 30],
  ['Galvanized Pipe 1/2" x 6 m', "PL-GIP-050", 3, "bulacan", "pcs", 310, 420, 4, 6, 0.1, 6],
];
/** Day (days ago) when the Bulacan supplier and its products were archived. */
const ARCHIVE_DAY = 20;
const ARCHIVED_SKUS = ["EL-INC-060", "PL-GIP-050"];

/** Products that end the simulation low or out of stock for the demo: sku → final quantity. */
const DEMO_LOW_STOCK = { "HT-WRN-010": 0, "PA-THN-001": 0, "EL-OUT-002": 9, "PL-TEF-050": 14, "CM-RBR-010": 18 };

// ---------------------------------------------------------------- Helpers

/** Deterministic pseudo-random numbers (mulberry32), so every seed run is identical. */
const random = (() => {
  let state = 20261015;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
})();
const pick = (items) => items[Math.floor(random() * items.length)];
const between = (min, max) => min + random() * (max - min);

/** Hours since Manila midnight right now (events today must be in the past). */
const hoursIntoToday = () => (Date.now() - startOfLocalDay(0).getTime()) / HOUR_MS;

/** A timestamp `daysAgo` days back at `hour` (Manila time, may be fractional). */
const at = (daysAgo, hour) => new Date(startOfLocalDay(daysAgo).getTime() + hour * HOUR_MS);

const CUSTOMER_NOTES = [
  "",
  "",
  "",
  "Walk-in customer",
  "Contractor order, Brgy. San Isidro",
  "House repair, Purok 3",
  "Bulk order for a sari-sari store renovation",
  "Delivered to customer",
];

// ---------------------------------------------------------------- Simulation

/**
 * Plays out the last 45 days and returns everything to insert.
 * @param {{ userBy: Record<string, any>, supplierBy: Record<string, any>, productBy: Map<string, any> }} refs
 */
const simulate = ({ userBy, supplierBy, productBy }) => {
  const movements = [];
  const orders = [];
  const stock = new Map(PRODUCTS.map((row) => [row[1], 0]));
  const onOrder = new Set();
  const people = (job) => USERS.filter((u) => u[4] === job).map((u) => userBy[u[0]]);
  const cashiers = [...people("cashier"), ...people("sales")];
  const receivers = [...people("receiving"), ...people("warehouse")];
  const owners = people("owner");

  const move = ({ sku, type, quantity, reason, note = "", user, time, order = null }) => {
    const previousQty = stock.get(sku);
    const newQty = previousQty + (type === "IN" ? quantity : -quantity);
    if (newQty < 0) throw new Error(`Seed error: ${sku} would go negative`);
    stock.set(sku, newQty);
    const product = productBy.get(sku);
    movements.push({
      product: product._id,
      productName: product.name,
      sku,
      type,
      quantity,
      previousQty,
      newQty,
      reason,
      note,
      performedBy: user._id,
      purchaseOrder: order?._id ?? null,
      order, // replaced by poNumber once POs are numbered
      createdAt: time,
      updatedAt: time,
    });
  };

  /** Builds a PO document (status and history filled in by the caller's steps). */
  const newOrder = ({ supplierKey, lines, requestedBy, requestedAt, notes = "" }) => {
    const supplier = supplierBy[supplierKey];
    const order = {
      _id: new mongoose.Types.ObjectId(),
      supplier: supplier._id,
      supplierName: supplier.name,
      items: lines.map(([sku, quantity]) => {
        const p = productBy.get(sku);
        return { product: p._id, productName: p.name, sku, unit: p.unit, quantity, unitCost: p.costPrice };
      }),
      notes,
      status: "Requested",
      requestedBy: requestedBy._id,
      history: [{ action: "Requested", by: requestedBy._id, at: requestedAt, note: notes }],
      createdAt: requestedAt,
      updatedAt: requestedAt,
    };
    orders.push(order);
    return order;
  };
  const approve = (order, by, time, note = "") => {
    Object.assign(order, { status: "Approved", approvedBy: by._id, approvedAt: time, updatedAt: time });
    order.history.push({ action: "Approved", by: by._id, at: time, note });
  };
  const receive = (order, by, time) => {
    Object.assign(order, { status: "Received", receivedBy: by._id, receivedAt: time, updatedAt: time });
    order.history.push({ action: "Received", by: by._id, at: time, note: "" });
    for (const item of order.items) {
      move({
        sku: item.sku,
        type: "IN",
        quantity: item.quantity,
        reason: "Purchase",
        note: `Received from ${order.supplierName}`,
        user: by,
        time,
        order,
      });
      onOrder.delete(item.sku);
    }
  };

  // Opening stock, entered by the owner when the system was set up.
  for (const [, sku, , , , , , , opening] of PRODUCTS) {
    move({
      sku,
      type: "IN",
      quantity: opening,
      reason: "Adjustment",
      note: "Opening stock (initial inventory count)",
      user: userBy.roberto,
      time: at(DAYS, 8 + random()),
    });
  }

  // The one PO from the supplier that is archived later (kept for history).
  const bulacanPo = newOrder({
    supplierKey: "bulacan",
    lines: [
      ["EL-INC-060", 30],
      ["PL-GIP-050", 6],
    ],
    requestedBy: userBy.lorna,
    requestedAt: at(DAYS - 2, 9.2),
  });
  approve(bulacanPo, userBy.roberto, at(DAYS - 2, 11.5));
  const scheduled = [{ order: bulacanPo, day: DAYS - 4 }];

  for (let day = DAYS - 1; day >= 0; day -= 1) {
    const latestHour = day === 0 ? Math.min(18, hoursIntoToday() - 0.25) : 18;

    // 1. Deliveries that arrive this morning.
    for (const delivery of scheduled.filter((s) => s.day === day)) {
      receive(delivery.order, pick(receivers), at(day, between(8.3, 10.5)));
    }

    // 2. Sales through the day (capped by what is on the shelf).
    const sales = [];
    for (const row of PRODUCTS) {
      const [, sku, , , , , , , , daily] = row;
      if (ARCHIVED_SKUS.includes(sku) && day <= ARCHIVE_DAY) continue;
      let units = 0;
      for (let i = 0; i < 3; i += 1) units += random() < 0.5 ? Math.round(daily * between(0.3, 1.4)) : 0;
      if (units > 0) sales.push([sku, units]);
    }
    sales
      .map(([sku, units]) => ({ sku, units, hour: between(9, 17.8) }))
      .filter((sale) => sale.hour < latestHour)
      .sort((a, b) => a.hour - b.hour)
      .forEach(({ sku, units, hour }) => {
        const quantity = Math.min(units, stock.get(sku));
        if (quantity <= 0) return;
        const seller = day > 12 && random() < 0.15 ? userBy.ramil : pick(cashiers);
        move({
          sku,
          type: "OUT",
          quantity,
          reason: "Sale",
          note: pick(CUSTOMER_NOTES),
          user: seller,
          time: at(day, hour),
        });
      });

    // Occasional damaged stock found during the weekly count.
    if (day % 7 === 3 && day > 0) {
      const sku = pick(["PA-THN-001", "CM-CEM-040", "PA-LAT-004", "PL-PVC-050"]);
      const quantity = Math.min(sku === "CM-CEM-040" ? 2 : 1, stock.get(sku));
      if (quantity > 0) {
        const note = sku === "CM-CEM-040" ? "Bags hardened after getting wet" : "Dented or leaking containers";
        move({ sku, type: "OUT", quantity, reason: "Damaged", note, user: userBy.rodel, time: at(day, 17.5) });
      }
    }

    // 3. End of day: request POs for items at or below their reorder level.
    if (day > REORDER_CUTOFF_DAY) {
      const low = PRODUCTS.filter(
        ([, sku, , supplierKey, , , , reorder]) =>
          !ARCHIVED_SKUS.includes(sku) && supplierKey !== "bulacan" && !onOrder.has(sku) && stock.get(sku) <= reorder
      );
      const bySupplier = new Map();
      for (const row of low) bySupplier.set(row[3], [...(bySupplier.get(row[3]) ?? []), row]);
      for (const [supplierKey, rows] of bySupplier) {
        const requestDay = day - 1;
        const order = newOrder({
          supplierKey,
          lines: rows.map(([, sku, , , , , , , , , orderQty]) => [sku, orderQty]),
          requestedBy: random() < 0.8 ? userBy.lorna : userBy.jomar,
          requestedAt: at(requestDay, between(8.2, 9.5)),
          notes: random() < 0.4 ? "Below reorder level" : "",
        });
        approve(order, pick(owners), at(requestDay, between(10, 15)));
        rows.forEach(([, sku]) => onOrder.add(sku));
        scheduled.push({ order, day: Math.max(requestDay - 1 - Math.floor(random() * 3), 1) });
      }
    }
  }

  // 4. Bring the demo items to their planned low/out-of-stock level with one last sale today.
  for (const [sku, target] of Object.entries(DEMO_LOW_STOCK)) {
    const excess = stock.get(sku) - target;
    if (excess > 0) {
      const time = new Date(Math.min(at(0, 10).getTime(), Date.now() - 40 * 60 * 1000));
      move({
        sku,
        type: "OUT",
        quantity: excess,
        reason: "Sale",
        note: "Contractor order",
        user: userBy.kristine,
        time,
      });
    }
  }

  return { movements, orders, stock, bulacanPo };
};

/** Requested / Approved / Rejected / Cancelled POs for the live demo. */
const addDemoOrders = ({ orders, userBy, supplierBy, productBy }) => {
  const make = (supplierKey, lines, requestedBy, requestedAt, notes = "") => {
    const supplier = supplierBy[supplierKey];
    const order = {
      _id: new mongoose.Types.ObjectId(),
      supplier: supplier._id,
      supplierName: supplier.name,
      items: lines.map(([sku, quantity, unitCost]) => {
        const p = productBy.get(sku);
        return { product: p._id, productName: p.name, sku, unit: p.unit, quantity, unitCost: unitCost ?? p.costPrice };
      }),
      notes,
      status: "Requested",
      requestedBy: requestedBy._id,
      history: [{ action: "Requested", by: requestedBy._id, at: requestedAt, note: notes }],
      createdAt: requestedAt,
      updatedAt: requestedAt,
    };
    orders.push(order);
    return order;
  };
  const step = (order, status, by, time, fields, note = "") => {
    Object.assign(order, { status, updatedAt: time, ...fields });
    order.history.push({ action: status, by: by._id, at: time, note });
  };
  const today = (hour) => new Date(Math.min(at(0, hour).getTime(), Date.now() - 20 * 60 * 1000));

  // Requested: waiting for an owner's approval.
  make(
    "rizal",
    [
      ["EL-OUT-002", 50],
      ["EL-CBR-020", 12],
    ],
    userBy.lorna,
    today(8.6),
    "Outlets are almost sold out"
  );
  make(
    "pampanga",
    [
      ["CM-RBR-010", 80],
      ["CM-PLY-025", 20],
    ],
    userBy.jomar,
    at(1, 15.2),
    "For the Dela Paz house project"
  );

  // Approved: ordered, delivery expected (receive one live to show stock IN).
  const wrench = make(
    "binondo",
    [
      ["HT-WRN-010", 10],
      ["HT-HKS-012", 6],
    ],
    userBy.lorna,
    at(2, 9.1)
  );
  step(wrench, "Approved", userBy.roberto, at(2, 11.4), { approvedBy: userBy.roberto._id, approvedAt: at(2, 11.4) });
  const thinner = make(
    "quezon",
    [
      ["PA-THN-001", 24],
      ["PA-BRS-002", 24],
    ],
    userBy.lorna,
    at(1, 9.4),
    "Paint thinner is out of stock"
  );
  step(thinner, "Approved", userBy.maricel, at(1, 13.2), { approvedBy: userBy.maricel._id, approvedAt: at(1, 13.2) });

  // Rejected, with the owner's reason.
  const drills = make("rizal", [["PW-DRL-650", 10, 1980]], userBy.jomar, at(9, 10.1));
  step(
    drills,
    "Rejected",
    userBy.roberto,
    at(9, 16.3),
    {
      rejectedBy: userBy.roberto._id,
      rejectedAt: at(9, 16.3),
      rejectionReason: "Unit cost is ₱130 higher than our last order. Ask Rizal Electrical for a new quotation.",
    },
    "Unit cost is ₱130 higher than our last order. Ask Rizal Electrical for a new quotation."
  );
  const gloves = make("binondo", [["SP-GLV-001", 300]], userBy.lorna, at(16, 9.8));
  step(
    gloves,
    "Rejected",
    userBy.maricel,
    at(16, 14),
    {
      rejectedBy: userBy.maricel._id,
      rejectedAt: at(16, 14),
      rejectionReason: "300 packs is too many; we sell about 60 a month. Please order 60.",
    },
    "300 packs is too many; we sell about 60 a month. Please order 60."
  );

  // Cancelled by the requester.
  const cement = make("mandaue", [["CM-CEM-040", 200]], userBy.jomar, at(11, 8.9));
  step(
    cement,
    "Cancelled",
    userBy.jomar,
    at(11, 10.2),
    {
      cancelledBy: userBy.jomar._id,
      cancelledAt: at(11, 10.2),
      cancellationReason: "Contractor cancelled the big cement order",
    },
    "Contractor cancelled the big cement order"
  );
  const rollers = make("quezon", [["PA-ROL-007", 12]], userBy.lorna, at(6, 9.3));
  step(
    rollers,
    "Cancelled",
    userBy.lorna,
    at(6, 9.6),
    {
      cancelledBy: userBy.lorna._id,
      cancelledAt: at(6, 9.6),
      cancellationReason: "Duplicate of an earlier request",
    },
    "Duplicate of an earlier request"
  );
  return { duplicateRollers: rollers };
};

/** Archive fields for a record archived at `time` by `user`. */
const archived = (user, time, reason) => ({
  archived: true,
  archivedAt: time,
  archivedBy: user._id,
  archiveReason: reason,
  archiveLog: [{ action: "Archived", by: user._id, at: time, reason }],
});

// ---------------------------------------------------------------- Main

/** Refuses to wipe a test database, or a remote one without --remote-ok. */
const assertSafeTarget = () => {
  const { name, host } = mongoose.connection;
  if (name.endsWith("_test")) throw new Error(`"${name}" is a test database; use npm run seed:test there.`);
  const local = ["127.0.0.1", "localhost", "::1"].includes(host);
  if (!local && !process.argv.includes("--remote-ok")) {
    throw new Error(
      `Refusing to reset the remote database "${name}" on ${host}. Re-run with --remote-ok if you really mean it.`
    );
  }
  return local;
};

const seed = async () => {
  await connectDB();
  const local = assertSafeTarget();
  console.log(`Connected to ${local ? "local" : "REMOTE"} database "${mongoose.connection.name}". Resetting data...`);

  const models = [User, Category, Supplier, Product, StockMovement, PurchaseOrder, Counter];
  await Promise.all(models.map((model) => model.deleteMany({})));
  await Promise.all(models.map((model) => model.syncIndexes()));

  const setupTime = at(DAYS + 15, 9);
  // create() (not insertMany) so the password-hashing hook runs.
  const users = await User.create(
    USERS.map(([, name, email, role]) => ({ name, email, role, password: PASSWORDS[role] }))
  );
  const userBy = Object.fromEntries(USERS.map(([key], i) => [key, users[i]]));
  await User.updateMany({}, { $set: { createdAt: setupTime } }, { timestamps: false });

  const categories = await Category.insertMany(
    CATEGORIES.map(([name, description]) => ({ name, description, createdAt: setupTime, updatedAt: setupTime })),
    { timestamps: false }
  );
  const suppliers = await Supplier.insertMany(
    SUPPLIERS.map(([, name, contactPerson, phone, email, address]) => ({
      name,
      contactPerson,
      phone,
      email,
      address,
      createdAt: setupTime,
      updatedAt: setupTime,
    })),
    { timestamps: false }
  );
  const supplierBy = Object.fromEntries(SUPPLIERS.map(([key], i) => [key, suppliers[i]]));

  const products = await Product.insertMany(
    PRODUCTS.map(([name, sku, cat, supplierKey, unit, costPrice, sellingPrice, reorderLevel]) => ({
      name,
      sku,
      category: categories[cat]._id,
      supplier: supplierBy[supplierKey]._id,
      description: `${name}. Usually ordered from ${supplierBy[supplierKey].name}.`,
      unit,
      costPrice,
      sellingPrice,
      quantity: 0,
      reorderLevel,
      createdAt: at(DAYS, 8),
      updatedAt: at(DAYS, 8),
    })),
    { timestamps: false }
  );
  const productBy = new Map(products.map((p) => [p.sku, p]));

  const { movements, orders, stock, bulacanPo } = simulate({ userBy, supplierBy, productBy });
  const { duplicateRollers } = addDemoOrders({ orders, userBy, supplierBy, productBy });

  // Number POs in the order they were requested: PO-<year>-0001, -0002, ...
  orders.sort((a, b) => a.createdAt - b.createdAt);
  orders.forEach((order, i) => {
    order.poNumber = `PO-${toLocalDateString(order.createdAt).slice(0, 4)}-${String(i + 1).padStart(4, "0")}`;
  });
  for (const m of movements) {
    m.poNumber = m.order?.poNumber ?? "";
    delete m.order;
  }

  // Archived records (history is kept; they just leave the active lists).
  const archiveTime = at(ARCHIVE_DAY, 16.5);
  Object.assign(
    orders.find((o) => o._id === bulacanPo._id),
    archived(userBy.maricel, archiveTime, "Supplier archived; PO kept for our records")
  );
  Object.assign(
    orders.find((o) => o._id === duplicateRollers._id),
    archived(userBy.roberto, at(5, 17), "Duplicate request; the earlier PO was used instead")
  );
  for (const order of orders.filter((o) => o.archived)) {
    order.history.push({ action: "Archived", by: order.archivedBy, at: order.archivedAt, note: order.archiveReason });
  }

  await PurchaseOrder.insertMany(orders, { timestamps: false });
  await Counter.create({ _id: "purchaseOrder", seq: orders.length });
  await StockMovement.insertMany(movements, { timestamps: false });
  await Product.bulkWrite(
    [...stock].map(([sku, quantity]) => ({
      updateOne: { filter: { _id: productBy.get(sku)._id }, update: { $set: { quantity } }, timestamps: false },
    }))
  );

  await Supplier.updateOne(
    { _id: supplierBy.bulacan._id },
    {
      $set: archived(
        userBy.maricel,
        archiveTime,
        "Closed its Manila branch; we now order from Binondo Hardware Trading"
      ),
    },
    { timestamps: false }
  );
  await Product.updateOne(
    { sku: "EL-INC-060" },
    { $set: archived(userBy.maricel, archiveTime, "Replaced by LED bulbs; no longer sold") },
    { timestamps: false }
  );
  await Product.updateOne(
    { sku: "PL-GIP-050" },
    { $set: archived(userBy.maricel, archiveTime, "Customers switched to PVC pipes") },
    { timestamps: false }
  );
  await User.updateOne(
    { _id: userBy.ramil._id },
    { $set: archived(userBy.maricel, at(12, 17), "Resigned; last working day was September 30") },
    { timestamps: false }
  );

  const counts = orders.reduce((acc, o) => ({ ...acc, [o.status]: (acc[o.status] ?? 0) + 1 }), {});
  console.log(
    `Seeded ${users.length} users, ${categories.length} categories, ${suppliers.length} suppliers, ` +
      `${products.length} products, ${movements.length} stock movements and ${orders.length} purchase orders ` +
      `(${Object.entries(counts)
        .map(([status, n]) => `${n} ${status}`)
        .join(", ")}).`
  );
  console.log(`Admin: roberto.santos@${DEMO_EMAIL_DOMAIN} / ${PASSWORDS.admin}`);
  console.log(`Staff: kristine.villanueva@${DEMO_EMAIL_DOMAIN} / ${PASSWORDS.staff}`);
  console.log("Run npm run check-data to verify the data.");
};

seed()
  .catch((error) => {
    console.error("Seeding failed:", error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
