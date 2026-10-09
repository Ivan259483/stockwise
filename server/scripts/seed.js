/**
 * Resets the database and loads realistic demo data for a Philippine hardware
 * store: 2 users, 5 categories, 4 suppliers, 21 products (some low or out of
 * stock on purpose) and about 30 stock movements over the last 7 days so the
 * dashboard charts have something to show.
 *
 * Usage: npm run seed   (WARNING: deletes all existing StockWise data)
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import Category from "../models/Category.js";
import Product from "../models/Product.js";
import StockMovement from "../models/StockMovement.js";
import Supplier from "../models/Supplier.js";
import User from "../models/User.js";
import { startOfLocalDay } from "../utils/dates.js";

dotenv.config({ quiet: true });

const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

const USERS = [
  { name: "Admin User", email: "admin@stockwise.com", password: "Admin123!", role: "admin" },
  { name: "Staff User", email: "staff@stockwise.com", password: "Staff123!", role: "staff" },
];

const CATEGORIES = [
  { name: "Hand Tools", description: "Hammers, wrenches, screwdrivers and measuring tools" },
  { name: "Electrical", description: "Wires, outlets, bulbs and extension cords" },
  { name: "Plumbing", description: "PVC pipes, fittings, faucets and sealants" },
  { name: "Paints & Coatings", description: "Latex and enamel paints, thinners and brushes" },
  { name: "Construction Materials", description: "Cement, rebar, plywood, nails and hollow blocks" },
];

const SUPPLIERS = [
  {
    name: "Manila Hardware Trading Co.",
    contactPerson: "Ramon Dela Cruz",
    phone: "0917 555 0142",
    email: "sales@manilahardware.example.com",
    address: "Juan Luna St., Binondo, Manila",
  },
  {
    name: "Cebu Builders Supply",
    contactPerson: "Maria Santos",
    phone: "0922 555 0178",
    email: "orders@cebubuilders.example.com",
    address: "Osmeña Blvd., Cebu City",
  },
  {
    name: "Davao Electrical Distributors",
    contactPerson: "Carlo Mendoza",
    phone: "0918 555 0193",
    email: "info@davaoelectrical.example.com",
    address: "C.M. Recto St., Davao City",
  },
  {
    name: "Luzon Paint & Plumbing Center",
    contactPerson: "Ana Reyes",
    phone: "(02) 8555 0127",
    email: "hello@luzonpaint.example.com",
    address: "E. Rodriguez Sr. Ave., Quezon City",
  },
];

/**
 * `quantity` is the stock level AFTER all movements below have been applied.
 * Columns: name, sku, category index, supplier index, unit, cost, price, qty, reorder level.
 */
const PRODUCTS = [
  ["Claw Hammer 16 oz", "HT-HAM-016", 0, 0, "pcs", 185, 260, 34, 10],
  ["Steel Tape Measure 5 m", "HT-TAP-005", 0, 0, "pcs", 95, 145, 48, 15],
  ["Screwdriver Set 6-pc", "HT-SCR-006", 0, 0, "box", 210, 320, 6, 8],
  ['Adjustable Wrench 10"', "HT-WRN-010", 0, 0, "pcs", 230, 340, 0, 5],
  ["THHN Wire 2.0 mm² (75 m)", "EL-WIR-020", 1, 2, "box", 2150, 2750, 12, 5],
  ["LED Bulb 9W Daylight", "EL-LED-009", 1, 2, "pcs", 65, 99, 120, 30],
  ["Convenience Outlet Duplex", "EL-OUT-002", 1, 2, "pcs", 48, 75, 9, 20],
  ["Extension Cord 4-Gang 3 m", "EL-EXT-004", 1, 2, "pcs", 260, 380, 22, 8],
  ['PVC Pipe 1/2" x 3 m', "PL-PVC-050", 2, 3, "pcs", 85, 125, 60, 20],
  ['Teflon Tape 1/2"', "PL-TEF-050", 2, 3, "pcs", 12, 20, 0, 25],
  ['Brass Faucet 1/2"', "PL-FAU-050", 2, 3, "pcs", 180, 265, 18, 6],
  ['PVC Elbow 1/2" 90°', "PL-ELB-050", 2, 3, "pcs", 9, 15, 14, 40],
  ["Latex Paint White 4 L", "PT-LAT-004", 3, 3, "pcs", 620, 795, 16, 6],
  ["Quick-Dry Enamel Black 1 L", "PT-QDE-001", 3, 3, "pcs", 260, 345, 4, 6],
  ['Paint Brush 2"', "PT-BRS-002", 3, 3, "pcs", 35, 55, 45, 15],
  ["Paint Thinner 1 L", "PT-THN-001", 3, 3, "L", 95, 135, 0, 10],
  ["Portland Cement 40 kg", "CM-CEM-040", 4, 1, "pcs", 245, 285, 75, 30],
  ['Common Nails 2" (per kg)', "CM-NAI-002", 4, 1, "kg", 75, 105, 28, 10],
  ["Deformed Bar 10 mm x 6 m", "CM-RBR-010", 4, 1, "pcs", 195, 245, 8, 25],
  ['Plywood 1/4" 4x8 ft', "CM-PLY-025", 4, 1, "pcs", 420, 520, 26, 10],
  ['Concrete Hollow Block 4"', "CM-CHB-004", 4, 1, "pcs", 12, 16, 350, 100],
];

/**
 * Movement plan in chronological order.
 * `when` is [daysAgo, hourOfDay] (Manila time), or { minutesAgo } for today.
 * Columns: sku, when, type, qty, reason, note, performedBy ("admin" | "staff").
 */
const MOVEMENTS = [
  ["HT-HAM-016", [6, 9.25], "IN", 20, "Purchase", "PO #1021 from Manila Hardware", "admin"],
  ["CM-CEM-040", [6, 10.67], "OUT", 25, "Sale", "Bulk order for a contractor", "staff"],
  ["EL-LED-009", [6, 14.1], "OUT", 18, "Sale", "", "staff"],
  ["PL-TEF-050", [6, 16.33], "OUT", 12, "Sale", "", "staff"],
  ["CM-CEM-040", [5, 8.5], "IN", 50, "Purchase", "Delivery from Cebu Builders", "admin"],
  ["PT-LAT-004", [5, 11.17], "OUT", 4, "Sale", "", "staff"],
  ["HT-WRN-010", [5, 13.75], "OUT", 3, "Sale", "", "staff"],
  ["CM-CHB-004", [5, 15.5], "OUT", 120, "Sale", "House extension project", "staff"],
  ["EL-OUT-002", [5, 17], "OUT", 11, "Sale", "", "staff"],
  ["PL-PVC-050", [4, 9], "IN", 40, "Purchase", "PO #1022", "admin"],
  ["PL-PVC-050", [4, 10.42], "OUT", 15, "Sale", "", "staff"],
  ["CM-RBR-010", [4, 13.83], "OUT", 30, "Sale", "Contractor order, Brgy. San Isidro", "staff"],
  ["PT-QDE-001", [4, 15.25], "OUT", 2, "Damaged", "Dented cans, leaking", "admin"],
  ["HT-SCR-006", [4, 16.67], "OUT", 4, "Sale", "", "staff"],
  ["EL-WIR-020", [3, 8.75], "IN", 10, "Purchase", "PO #1023 from Davao Electrical", "admin"],
  ["EL-WIR-020", [3, 11.5], "OUT", 3, "Sale", "", "staff"],
  ["CM-NAI-002", [3, 14.17], "OUT", 12, "Sale", "", "staff"],
  ["PT-THN-001", [3, 16], "OUT", 8, "Sale", "", "staff"],
  ["HT-WRN-010", [3, 17.33], "OUT", 2, "Sale", "Last units sold", "staff"],
  ["CM-CHB-004", [2, 8.33], "IN", 200, "Purchase", "Delivery from Cebu Builders", "admin"],
  ["PL-FAU-050", [2, 10.08], "OUT", 3, "Sale", "", "staff"],
  ["PL-ELB-050", [2, 13.5], "OUT", 26, "Sale", "Plumbing contractor", "staff"],
  ["EL-EXT-004", [2, 15.67], "OUT", 5, "Sale", "", "staff"],
  ["PT-BRS-002", [2, 17.17], "OUT", 10, "Sale", "", "staff"],
  ["EL-LED-009", [1, 9.17], "IN", 60, "Purchase", "PO #1024", "admin"],
  ["PT-LAT-004", [1, 11.75], "OUT", 6, "Sale", "", "staff"],
  ["HT-TAP-005", [1, 14.33], "OUT", 7, "Sale", "", "staff"],
  ["PL-TEF-050", [1, 16.5], "OUT", 13, "Sale", "Sold out", "staff"],
  ["PT-THN-001", { minutesAgo: 180 }, "OUT", 4, "Damaged", "Leaking containers", "staff"],
  ["HT-HAM-016", { minutesAgo: 90 }, "OUT", 5, "Sale", "", "staff"],
  ["CM-PLY-025", { minutesAgo: 45 }, "IN", 15, "Purchase", "PO #1025", "admin"],
];

/** Converts a movement's `when` into an absolute timestamp. */
const toTimestamp = (when) =>
  Array.isArray(when)
    ? new Date(startOfLocalDay(when[0]).getTime() + when[1] * HOUR_MS)
    : new Date(Date.now() - when.minutesAgo * MINUTE_MS);

/**
 * Works backwards from each product's final quantity to its opening quantity,
 * so the seeded history is internally consistent (previousQty/newQty chain).
 *
 * @returns {Map<string, number>} opening quantity by SKU
 */
const computeOpeningQuantities = () => {
  const opening = new Map(PRODUCTS.map(([, sku, , , , , , qty]) => [sku, qty]));
  for (const [sku, , type, qty] of MOVEMENTS) {
    opening.set(sku, opening.get(sku) + (type === "IN" ? -qty : qty));
  }
  for (const [sku, qty] of opening) {
    if (qty < 0) throw new Error(`Seed data error: ${sku} would start with negative stock (${qty})`);
  }
  return opening;
};

const seed = async () => {
  await connectDB();
  console.log(`Connected to database "${mongoose.connection.name}". Resetting data...`);

  const models = [User, Category, Supplier, Product, StockMovement];
  await Promise.all(models.map((model) => model.deleteMany({})));
  // Make sure unique indexes exist before inserting (fresh databases have none yet).
  await Promise.all(models.map((model) => model.syncIndexes()));

  // create() (not insertMany) so the password-hashing pre-save hook runs.
  const users = await User.create(USERS);
  const userByRole = Object.fromEntries(users.map((user) => [user.role, user]));

  const categories = await Category.insertMany(CATEGORIES);
  const suppliers = await Supplier.insertMany(SUPPLIERS);

  const opening = computeOpeningQuantities();
  const products = await Product.insertMany(
    PRODUCTS.map(([name, sku, cat, sup, unit, costPrice, sellingPrice, , reorderLevel]) => ({
      name,
      sku,
      category: categories[cat]._id,
      supplier: suppliers[sup]._id,
      description: `${name}. Stocked by ${suppliers[sup].name}.`,
      unit,
      costPrice,
      sellingPrice,
      quantity: opening.get(sku),
      reorderLevel,
    }))
  );
  const productBySku = new Map(products.map((product) => [product.sku, product]));

  // Replay the plan to fill previousQty/newQty, then store the final quantities.
  const running = new Map(opening);
  const movements = MOVEMENTS.map(([sku, when, type, quantity, reason, note, role]) => {
    const product = productBySku.get(sku);
    const previousQty = running.get(sku);
    const newQty = previousQty + (type === "IN" ? quantity : -quantity);
    if (newQty < 0) throw new Error(`Seed data error: ${sku} would go negative`);
    running.set(sku, newQty);

    const timestamp = toTimestamp(when);
    return {
      product: product._id,
      productName: product.name,
      sku,
      type,
      quantity,
      previousQty,
      newQty,
      reason,
      note,
      performedBy: userByRole[role]._id,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  });
  // timestamps: false keeps the backdated createdAt values instead of "now".
  await StockMovement.insertMany(movements, { timestamps: false });
  await Product.bulkWrite(
    [...running].map(([sku, quantity]) => ({
      updateOne: { filter: { _id: productBySku.get(sku)._id }, update: { $set: { quantity } } },
    }))
  );

  console.log(
    `Seeded ${users.length} users, ${categories.length} categories, ${suppliers.length} suppliers, ` +
      `${products.length} products and ${movements.length} stock movements.`
  );
  console.log("Demo accounts: admin@stockwise.com / Admin123!  |  staff@stockwise.com / Staff123!");
};

seed()
  .catch((error) => {
    console.error("Seeding failed:", error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
