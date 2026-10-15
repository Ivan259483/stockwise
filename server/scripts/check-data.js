/**
 * Data check for the database in server/.env (the demo database).
 *
 * Prints the record counts the presentation relies on, checks that the data
 * is consistent (stock levels match the movement history, received POs have
 * their stock-in movements) and flags anything that looks like test or dummy
 * data (test accounts, "Smoke"/"E2E" records, placeholder names or domains).
 *
 * Usage: npm run check-data
 * Exit code 1 when a problem or suspicious record is found.
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import Category from "../models/Category.js";
import Product from "../models/Product.js";
import PurchaseOrder from "../models/PurchaseOrder.js";
import StockMovement from "../models/StockMovement.js";
import Supplier from "../models/Supplier.js";
import User from "../models/User.js";
import { ACTIVE_FILTER } from "../models/plugins/archivable.js";
import { PO_STATUSES } from "../utils/constants.js";

dotenv.config({ quiet: true });

/** Words that should never appear in presentation data. */
const SUSPICIOUS_TEXT =
  /\b(test(ing)?|dummy|sample|lorem|ipsum|foo|asdf|qwerty|smoke|e2e|placeholder|xxx+|tmp|temp)\b/i;
/** Email domains used by tests, documentation or the old demo accounts. */
const SUSPICIOUS_DOMAIN = /(@|\.)(example\.(com|net|org)|stockwise\.com|test|invalid|localhost|mailinator\.com)$/i;
/** SKU prefixes created by the automated tests. */
const SUSPICIOUS_SKU = /^(E2E|SMK|TEST|BAD|DUP|Y)-/i;

const problems = [];
const flags = [];
const flag = (what, value, why) => flags.push(`${what}: "${value}" (${why})`);

const line = (label, value) => console.log(`  ${label.padEnd(34, ".")} ${value}`);
const section = (title) => console.log(`\n${title}`);

/** Counts documents per value of `field`, e.g. { IN: 120, OUT: 300 }. */
const countBy = async (model, field, match = {}) => {
  const rows = await model.aggregate([{ $match: match }, { $group: { _id: `$${field}`, n: { $sum: 1 } } }]);
  return Object.fromEntries(rows.map((r) => [r._id, r.n]));
};

const run = async () => {
  await connectDB();
  const { name, host } = mongoose.connection;
  console.log(`StockWise data check → database "${name}" on ${host}`);
  if (name.endsWith("_test")) console.log("  (note: this is a TEST database, not the demo data)");

  // ------------------------------------------------------------ Counts
  const [users, categories, suppliers, products, movements, orders] = await Promise.all([
    User.find().select("name email role isActive archived"),
    Category.find().select("name description"),
    Supplier.find().select("name contactPerson email archived"),
    Product.find().select("name sku quantity reorderLevel costPrice sellingPrice archived"),
    StockMovement.find().select("product sku type quantity reason note purchaseOrder"),
    PurchaseOrder.find().select("poNumber status items notes supplier requestedBy archived"),
  ]);
  const activeUsers = users.filter((u) => !u.archived);
  const admins = activeUsers.filter((u) => u.role === "admin").length;
  const staff = activeUsers.filter((u) => u.role === "staff").length;
  const activeProducts = products.filter((p) => !p.archived);
  const poCounts = Object.fromEntries(PO_STATUSES.map((s) => [s, 0]));
  for (const o of orders) poCounts[o.status] += 1;
  const movementTypes = await countBy(StockMovement, "type");
  const reasons = await countBy(StockMovement, "reason");

  section("Users");
  line("Active users", `${activeUsers.length} (${admins} admins, ${staff} staff)`);
  line("Archived users", users.length - activeUsers.length);
  section("Catalog");
  line("Categories", categories.length);
  line(
    "Suppliers",
    `${suppliers.filter((s) => !s.archived).length} active, ${suppliers.filter((s) => s.archived).length} archived`
  );
  line("Products", `${activeProducts.length} active, ${products.length - activeProducts.length} archived`);
  line(
    "  low stock / out of stock",
    `${activeProducts.filter((p) => p.quantity > 0 && p.quantity <= p.reorderLevel).length} / ${activeProducts.filter((p) => p.quantity <= 0).length}`
  );
  section("Stock movements");
  line("Total", movements.length);
  line("Stock IN / stock OUT", `${movementTypes.IN ?? 0} / ${movementTypes.OUT ?? 0}`);
  line(
    "By reason",
    Object.entries(reasons)
      .map(([r, n]) => `${r} ${n}`)
      .join(", ")
  );
  section("Purchase orders");
  line("Total", `${orders.length} (${orders.filter((o) => o.archived).length} archived)`);
  for (const status of PO_STATUSES) line(`  ${status}`, poCounts[status]);

  // ------------------------------------------------------------ Requirements for the presentation
  section("Presentation requirements");
  const requirements = [
    ["At least 10 users (2+ admins, 8+ staff)", activeUsers.length >= 10 && admins >= 2 && staff >= 8],
    ["At least 20 Received purchase orders", poCounts.Received >= 20],
    [
      "Requested, Approved, Rejected and Cancelled POs exist",
      ["Requested", "Approved", "Rejected", "Cancelled"].every((s) => poCounts[s] > 0),
    ],
    ["Stock OUT movements (sales) exist", (reasons.Sale ?? 0) > 0],
    ["Archived records exist", [users, suppliers, products, orders].some((list) => list.some((r) => r.archived))],
  ];
  for (const [label, ok] of requirements) {
    console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}`);
    if (!ok) problems.push(`Requirement not met: ${label}`);
  }

  // ------------------------------------------------------------ Consistency
  section("Consistency");
  const totals = new Map();
  for (const m of movements) {
    const key = String(m.product);
    totals.set(key, (totals.get(key) ?? 0) + (m.type === "IN" ? m.quantity : -m.quantity));
  }
  const mismatched = products.filter((p) => (totals.get(String(p._id)) ?? 0) !== p.quantity);
  for (const p of mismatched) {
    problems.push(`${p.sku} quantity ${p.quantity} ≠ movements total ${totals.get(String(p._id)) ?? 0}`);
  }
  console.log(`  ${mismatched.length ? "FAIL" : "PASS"}  Every product's quantity equals IN − OUT of its movements`);

  const poMovements = new Map();
  for (const m of movements.filter((x) => x.purchaseOrder)) {
    const key = String(m.purchaseOrder);
    poMovements.set(key, [...(poMovements.get(key) ?? []), m]);
  }
  const badPos = orders.filter((o) => {
    const linked = poMovements.get(String(o._id)) ?? [];
    if (o.status !== "Received") return linked.length > 0;
    return (
      linked.length !== o.items.length ||
      o.items.some((item) => !linked.some((m) => m.sku === item.sku && m.quantity === item.quantity && m.type === "IN"))
    );
  });
  for (const o of badPos) problems.push(`${o.poNumber} (${o.status}) does not match its stock-in movements`);
  console.log(
    `  ${badPos.length ? "FAIL" : "PASS"}  Received POs have one matching stock IN per item (others have none)`
  );

  const userIds = new Set(users.map((u) => String(u._id)));
  const supplierIds = new Set(suppliers.map((s) => String(s._id)));
  const orphans = orders.filter((o) => !userIds.has(String(o.requestedBy)) || !supplierIds.has(String(o.supplier)));
  for (const o of orphans) problems.push(`${o.poNumber} references a missing user or supplier`);
  console.log(`  ${orphans.length ? "FAIL" : "PASS"}  POs reference existing users and suppliers`);

  const openWithArchived = await PurchaseOrder.countDocuments({
    ...ACTIVE_FILTER,
    status: { $in: ["Requested", "Approved"] },
    "items.product": { $in: products.filter((p) => p.archived).map((p) => p._id) },
  });
  if (openWithArchived) problems.push(`${openWithArchived} open PO(s) include archived products`);
  console.log(`  ${openWithArchived ? "FAIL" : "PASS"}  No open PO contains an archived product`);

  // ------------------------------------------------------------ Test / dummy data
  for (const u of users) {
    if (SUSPICIOUS_DOMAIN.test(u.email)) flag("User email", u.email, "test or placeholder domain");
    if (SUSPICIOUS_TEXT.test(u.name) || /^(admin|staff) user$/i.test(u.name))
      flag("User name", u.name, "looks like a test account");
  }
  for (const c of categories)
    if (SUSPICIOUS_TEXT.test(`${c.name} ${c.description}`)) flag("Category", c.name, "test wording");
  for (const s of suppliers) {
    if (SUSPICIOUS_TEXT.test(`${s.name} ${s.contactPerson}`)) flag("Supplier", s.name, "test wording");
    if (s.email && SUSPICIOUS_DOMAIN.test(s.email)) flag("Supplier email", s.email, "test or placeholder domain");
  }
  for (const p of products) {
    if (SUSPICIOUS_SKU.test(p.sku)) flag("Product SKU", p.sku, "created by an automated test");
    if (SUSPICIOUS_TEXT.test(p.name)) flag("Product", p.name, "test wording");
    if (p.costPrice <= 0 || p.sellingPrice <= 0) flag("Product price", p.name, "zero price");
    if (p.sellingPrice < p.costPrice) flag("Product price", p.name, "sells below cost");
  }
  for (const m of movements) if (SUSPICIOUS_TEXT.test(m.note)) flag("Movement note", m.note, `${m.sku}`);
  for (const o of orders) if (SUSPICIOUS_TEXT.test(o.notes)) flag("PO note", o.notes, o.poNumber);

  section("Test or dummy data");
  if (flags.length === 0) console.log("  PASS  Nothing looks like test or dummy data");
  else flags.slice(0, 50).forEach((f) => console.log(`  FLAG  ${f}`));
  if (flags.length > 50) console.log(`  ... and ${flags.length - 50} more`);

  console.log(
    `\n${problems.length === 0 && flags.length === 0 ? "OK: data is ready for the presentation." : `Found ${problems.length} problem(s) and ${flags.length} suspicious record(s).`}`
  );
  problems.forEach((p) => console.log(`  - ${p}`));
  process.exitCode = problems.length || flags.length ? 1 : 0;
};

run()
  .catch((error) => {
    console.error("Data check failed:", error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
