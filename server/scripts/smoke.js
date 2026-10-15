/**
 * End-to-end smoke test for a running StockWise API.
 *
 * Exercises authentication, account management, password recovery, CRUD,
 * stock in/out and the main error paths, and prints PASS/FAIL per check. It
 * creates its own temporary records (category, supplier, product, user, POs)
 * and archives them at the end (nothing is hard-deleted any more).
 *
 * It only runs against the TEST API (server started with `npm run dev:test`,
 * database "stockwise_test" seeded with `npm run seed:test`): it aborts if the
 * API reports any database whose name does not end in "_test", so it can never
 * touch the demo or live data. It reads password-reset codes from the test
 * mail outbox (tmp/outbox.jsonl) that the API writes when NODE_ENV=test.
 *
 * Usage: npm run seed:test && npm run smoke      # http://localhost:5051/api
 * (tools/run-tests.mjs does all of this, including starting the servers.)
 */
import { readFile } from "node:fs/promises";
import { OUTBOX_FILE } from "../services/mailer.js";

const API_URL = (process.env.API_URL ?? process.argv[2] ?? "http://localhost:5051/api").replace(/\/$/, "");
const ADMIN = { email: "admin@stockwise.test", password: "Admin123!" };
const STAFF = { email: "staff@stockwise.test", password: "Staff123!" };
const RECOVERY = { email: "recovery@stockwise.test", password: "Staff123!" };

/** All messages the test API has "sent" to `email`, oldest first. */
const readOutbox = async (email) => {
  const text = await readFile(OUTBOX_FILE, "utf8").catch(() => "");
  return text
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .filter((message) => message.to.includes(email));
};

/** The 6-digit code in the most recent reset email for `email`, or null. */
const latestResetCode = async (email) => {
  const messages = await readOutbox(email);
  return messages.at(-1)?.text.match(/\b(\d{6})\b/)?.[1] ?? null;
};

const results = [];
const suffix = Date.now().toString(36).toUpperCase();

/**
 * Sends a JSON request and returns `{ status, body }` (never throws on HTTP errors).
 * @param {string} method
 * @param {string} path
 * @param {{ token?: string, body?: unknown }} [options]
 */
const request = async (method, path, { token, body } = {}) => {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { status: response.status, body: json };
};

/**
 * Records one check. `expectStatus` is compared with the response status and
 * the optional `assert` callback can check the body.
 */
const check = (name, response, expectStatus, assert = () => true) => {
  let passed = response.status === expectStatus;
  let detail = `status ${response.status}`;
  if (passed) {
    try {
      passed = assert(response.body) !== false;
    } catch (error) {
      passed = false;
      detail += `, ${error.message}`;
    }
  }
  if (!passed) detail += `, body: ${JSON.stringify(response.body).slice(0, 200)}`;
  results.push({ name, passed });
  console.log(`${passed ? "PASS" : "FAIL"}  ${name}${passed ? "" : `  (${detail})`}`);
  return response.body;
};

const run = async () => {
  console.log(`StockWise smoke test → ${API_URL}\n`);

  const health = check("GET /health returns ok", await request("GET", "/health"), 200, (b) => b.data.status === "ok");
  const databaseName = health?.data?.databaseName ?? "";
  if (!databaseName.endsWith("_test")) {
    console.error(
      `\nAborted: the API is using database "${databaseName || "unknown (production?)"}". ` +
        "The smoke test only runs against a *_test database (npm run dev:test)."
    );
    process.exitCode = 1;
    return;
  }

  // --- Authentication ------------------------------------------------------
  const adminLogin = check("Admin login", await request("POST", "/auth/login", { body: ADMIN }), 200, (b) =>
    Boolean(b.data.token && b.data.user.role === "admin" && b.data.user.password === undefined)
  );
  const adminToken = adminLogin?.data?.token;
  const adminId = adminLogin?.data?.user?._id;
  const staffLogin = check("Staff login", await request("POST", "/auth/login", { body: STAFF }), 200);
  // Replaced after the password-change checks, which sign out the old token.
  let staffToken = staffLogin?.data?.token;

  check(
    "Login with wrong password → 401",
    await request("POST", "/auth/login", { body: { ...ADMIN, password: "WrongPass1" } }),
    401
  );
  check(
    "Register with invalid data → 400 with field errors",
    await request("POST", "/auth/register", { body: { name: "", email: "bad", password: "123" } }),
    400,
    (b) => b.success === false && b.errors.some((e) => e.field === "email")
  );
  check(
    "GET /auth/me with token",
    await request("GET", "/auth/me", { token: adminToken }),
    200,
    (b) => b.data.email === ADMIN.email
  );
  check("No token → 401", await request("GET", "/products"), 401, (b) => b.success === false);
  check("Malformed token → 401", await request("GET", "/products", { token: "not.a.jwt" }), 401);

  // --- Profile and password change ----------------------------------------
  check(
    "Staff updates own name (profile)",
    await request("PATCH", "/auth/me", { token: staffToken, body: { name: "Staff User (edited)" } }),
    200,
    (b) => b.data.name === "Staff User (edited)" && b.data.role === "staff"
  );
  check(
    "Profile email already used by another account → 409",
    await request("PATCH", "/auth/me", { token: staffToken, body: { email: ADMIN.email } }),
    409,
    (b) => b.errors[0].field === "email"
  );
  check(
    "Profile cannot change own role",
    await request("PATCH", "/auth/me", { token: staffToken, body: { name: "Staff User", role: "admin" } }),
    200,
    (b) => b.data.role === "staff" && b.data.name === "Staff User"
  );
  check(
    "Change password with wrong current password → 400",
    await request("PATCH", "/auth/me/password", {
      token: staffToken,
      body: { currentPassword: "Wrong1234", newPassword: "NewStaff123" },
    }),
    400,
    (b) => b.errors[0].field === "currentPassword"
  );
  const changed = check(
    "Change password returns a new token",
    await request("PATCH", "/auth/me/password", {
      token: staffToken,
      body: { currentPassword: STAFF.password, newPassword: "NewStaff123" },
    }),
    200,
    (b) => Boolean(b.data.token)
  );
  check(
    "Old token is rejected after a password change → 401",
    await request("GET", "/auth/me", { token: staffToken }),
    401
  );
  const restored = check(
    "Change password back (new token works)",
    await request("PATCH", "/auth/me/password", {
      token: changed?.data?.token,
      body: { currentPassword: "NewStaff123", newPassword: STAFF.password },
    }),
    200
  );
  staffToken = restored?.data?.token;

  // --- Password recovery ---------------------------------------------------
  check(
    "Forgot password for an unknown email → same generic 200",
    await request("POST", "/auth/forgot-password", { body: { email: "nobody@stockwise.test" } }),
    200,
    (b) => b.message.startsWith("If an account with that email exists")
  );
  check(
    "Forgot password sends a 6-digit code",
    await request("POST", "/auth/forgot-password", { body: { email: RECOVERY.email } }),
    200,
    () => true
  );
  const code = await latestResetCode(RECOVERY.email);
  check("Reset email contains a 6-digit code", { status: code ? 200 : 0, body: {} }, 200);
  const mailCount = (await readOutbox(RECOVERY.email)).length;
  await request("POST", "/auth/forgot-password", { body: { email: RECOVERY.email } });
  check(
    "Second request within the cooldown sends no new code",
    { status: (await readOutbox(RECOVERY.email)).length === mailCount ? 200 : 0, body: {} },
    200
  );
  const wrongCode = code === "000000" ? "111111" : "000000";
  check(
    "Reset with a wrong code → 400 with attempts left",
    await request("POST", "/auth/reset-password", {
      body: { email: RECOVERY.email, code: wrongCode, password: "Recovered123" },
    }),
    400,
    (b) => b.message.includes("attempts left")
  );
  check(
    "Reset with a malformed code → 400",
    await request("POST", "/auth/reset-password", {
      body: { email: RECOVERY.email, code: "12ab", password: "Recovered123" },
    }),
    400,
    (b) => b.errors[0].field === "code"
  );
  check(
    "Reset with the emailed code",
    await request("POST", "/auth/reset-password", { body: { email: RECOVERY.email, code, password: "Recovered123" } }),
    200
  );
  check(
    "The code cannot be used twice",
    await request("POST", "/auth/reset-password", { body: { email: RECOVERY.email, code, password: "Again12345" } }),
    400
  );
  check(
    "Login with the new password",
    await request("POST", "/auth/login", { body: { email: RECOVERY.email, password: "Recovered123" } }),
    200
  );
  check("Old password no longer works → 401", await request("POST", "/auth/login", { body: RECOVERY }), 401);

  // --- User management (admin) ---------------------------------------------
  const newUserEmail = `new.user.${suffix.toLowerCase()}@stockwise.test`;
  const newUser = check(
    "Admin adds a user with a role",
    await request("POST", "/users", {
      token: adminToken,
      body: { name: "New Staff", email: newUserEmail, password: "Temp1234", role: "staff" },
    }),
    201,
    (b) => b.data.email === newUserEmail && b.data.role === "staff" && b.data.password === undefined
  )?.data;
  check(
    "Admin adding a duplicate email → 409",
    await request("POST", "/users", {
      token: adminToken,
      body: { name: "Dup", email: newUserEmail, password: "Temp1234", role: "staff" },
    }),
    409
  );
  check(
    "Admin adding a user with a weak password → 400",
    await request("POST", "/users", {
      token: adminToken,
      body: { name: "Weak", email: `weak.${suffix.toLowerCase()}@stockwise.test`, password: "short", role: "staff" },
    }),
    400,
    (b) => b.errors.some((e) => e.field === "password")
  );
  check(
    "Staff adding a user → 403",
    await request("POST", "/users", {
      token: staffToken,
      body: { name: "X", email: `x.${suffix.toLowerCase()}@stockwise.test`, password: "Temp1234", role: "admin" },
    }),
    403
  );
  check(
    "Admin edits a user's name, email and role",
    await request("PATCH", `/users/${newUser?._id}`, {
      token: adminToken,
      body: { name: "New Admin", email: newUserEmail, role: "admin" },
    }),
    200,
    (b) => b.data.name === "New Admin" && b.data.role === "admin"
  );
  const newUserToken = check(
    "New user can log in with the temporary password",
    await request("POST", "/auth/login", { body: { email: newUserEmail, password: "Temp1234" } }),
    200,
    (b) => b.data.user.role === "admin"
  )?.data?.token;

  // --- Categories CRUD -----------------------------------------------------
  const category = check(
    "Create category",
    await request("POST", "/categories", { token: adminToken, body: { name: `Smoke Category ${suffix}` } }),
    201
  )?.data;
  check(
    "Duplicate category name → 409",
    await request("POST", "/categories", { token: adminToken, body: { name: `smoke category ${suffix}` } }),
    409,
    (b) => b.errors[0].field === "name"
  );
  check(
    "Update category",
    await request("PUT", `/categories/${category?._id}`, {
      token: adminToken,
      body: { name: `Smoke Category ${suffix}`, description: "Updated by smoke test" },
    }),
    200,
    (b) => b.data.description === "Updated by smoke test"
  );
  check("List categories with product counts", await request("GET", "/categories", { token: staffToken }), 200, (b) =>
    b.data.every((c) => typeof c.productCount === "number")
  );

  // --- Suppliers CRUD ------------------------------------------------------
  const supplier = check(
    "Create supplier",
    await request("POST", "/suppliers", {
      token: adminToken,
      body: { name: `Smoke Supplier ${suffix}`, phone: "0917 000 0000", email: "smoke@example.com" },
    }),
    201
  )?.data;
  check(
    "Supplier with invalid email → 400",
    await request("POST", "/suppliers", { token: adminToken, body: { name: "X", email: "not-an-email" } }),
    400
  );
  check(
    "Update supplier",
    await request("PUT", `/suppliers/${supplier?._id}`, {
      token: adminToken,
      body: { name: `Smoke Supplier ${suffix}`, contactPerson: "Juan Tester" },
    }),
    200,
    (b) => b.data.contactPerson === "Juan Tester"
  );
  check("List suppliers", await request("GET", "/suppliers", { token: staffToken }), 200);

  // --- Products CRUD -------------------------------------------------------
  const sku = `SMK-${suffix}`;
  const product = check(
    "Create product with opening stock",
    await request("POST", "/products", {
      token: adminToken,
      body: {
        name: "Smoke Test Product",
        sku: sku.toLowerCase(),
        category: category?._id,
        supplier: supplier?._id,
        costPrice: 100,
        sellingPrice: 150,
        quantity: 5,
        reorderLevel: 3,
      },
    }),
    201,
    (b) => b.data.sku === sku && b.data.stockStatus === "in_stock" && b.data.stockValue === 500
  )?.data;
  check(
    "Duplicate SKU → 409",
    await request("POST", "/products", {
      token: adminToken,
      body: { name: "Duplicate", sku, category: category?._id },
    }),
    409,
    (b) => b.errors[0].field === "sku" && b.message === "SKU already exists"
  );
  check(
    "Product with negative price → 400",
    await request("POST", "/products", {
      token: adminToken,
      body: { name: "Bad", sku: `BAD-${suffix}`, category: category?._id, costPrice: -1 },
    }),
    400,
    (b) => b.errors.some((e) => e.field === "costPrice")
  );
  check(
    "Update product",
    await request("PUT", `/products/${product?._id}`, {
      token: adminToken,
      body: { name: "Smoke Test Product (edited)", sku, category: category?._id, sellingPrice: 175 },
    }),
    200,
    (b) => b.data.sellingPrice === 175 && b.data.quantity === 5
  );
  check(
    "List products with search, filter and pagination",
    await request("GET", `/products?search=${sku}&category=${category?._id}&page=1&limit=5`, { token: staffToken }),
    200,
    (b) => b.total === 1 && b.totalPages === 1 && b.data[0].sku === sku
  );
  check(
    "List products filtered by status=out_of_stock",
    await request("GET", "/products?status=out_of_stock&sort=-quantity", { token: staffToken }),
    200,
    (b) => b.data.every((p) => p.stockStatus === "out_of_stock")
  );

  // --- Stock movements -----------------------------------------------------
  check(
    "Stock IN (staff) +10",
    await request("POST", "/stock/in", {
      token: staffToken,
      body: { productId: product?._id, quantity: 10, reason: "Purchase", note: "Smoke test" },
    }),
    201,
    (b) => b.data.movement.previousQty === 5 && b.data.movement.newQty === 15 && b.data.product.quantity === 15
  );
  check(
    "Stock OUT (staff) -12",
    await request("POST", "/stock/out", {
      token: staffToken,
      body: { productId: product?._id, quantity: 12, reason: "Sale" },
    }),
    201,
    (b) => b.data.movement.newQty === 3 && b.data.product.stockStatus === "low_stock"
  );
  const alertsFor = async (name) =>
    (await readOutbox(ADMIN.email)).filter((m) => m.subject.startsWith(`Stock alert: ${name}`)).length;
  check(
    "Dropping to the reorder level emails the admins a low-stock alert",
    { status: (await alertsFor("Smoke Test Product")) === 1 ? 200 : 0, body: {} },
    200
  );
  check(
    "Stock OUT exceeding quantity → 409",
    await request("POST", "/stock/out", {
      token: staffToken,
      body: { productId: product?._id, quantity: 4, reason: "Sale" },
    }),
    409,
    (b) => b.message === "Insufficient stock: only 3 available"
  );
  check(
    "Stock OUT with invalid reason → 400",
    await request("POST", "/stock/out", {
      token: staffToken,
      body: { productId: product?._id, quantity: 1, reason: "Purchase" },
    }),
    400
  );
  check(
    "Product details include movement history",
    await request("GET", `/products/${product?._id}`, { token: staffToken }),
    200,
    (b) => b.data.product.quantity === 3 && b.data.movements.length === 3
  );
  check(
    "Movement history filtered by product and type",
    await request("GET", `/stock/movements?product=${product?._id}&type=OUT`, { token: staffToken }),
    200,
    (b) => b.total === 1 && b.data[0].type === "OUT"
  );
  check("Dashboard summary", await request("GET", "/dashboard/summary", { token: staffToken }), 200, (b) =>
    Boolean(b.data.totalProducts > 0 && b.data.movementsByDay.length === 7 && Array.isArray(b.data.valueByCategory))
  );

  // --- Purchase orders -----------------------------------------------------
  check(
    "PO without items → 400",
    await request("POST", "/purchase-orders", { token: staffToken, body: { supplier: supplier?._id, items: [] } }),
    400,
    (b) => b.errors.some((e) => e.field === "items")
  );
  check(
    "PO with the same product twice → 400",
    await request("POST", "/purchase-orders", {
      token: staffToken,
      body: {
        supplier: supplier?._id,
        items: [
          { product: product?._id, quantity: 1, unitCost: 1 },
          { product: product?._id, quantity: 2, unitCost: 1 },
        ],
      },
    }),
    400
  );
  const po = check(
    "Staff requests a PO (status Requested, totals computed)",
    await request("POST", "/purchase-orders", {
      token: staffToken,
      body: { supplier: supplier?._id, items: [{ product: product?._id, quantity: 20, unitCost: 95 }], notes: "Smoke" },
    }),
    201,
    (b) =>
      /^PO-\d{4}-\d{4}$/.test(b.data.poNumber) &&
      b.data.status === "Requested" &&
      b.data.totalAmount === 1900 &&
      b.data.items[0].sku === sku &&
      b.data.requestedBy.name === "Staff User"
  )?.data;
  check(
    "Staff approving a PO → 403",
    await request("PATCH", `/purchase-orders/${po?._id}/approve`, { token: staffToken }),
    403
  );
  check(
    "PO list filtered by status with per-status counts",
    await request("GET", "/purchase-orders?status=Requested", { token: staffToken }),
    200,
    (b) =>
      b.data.some((o) => o._id === po?._id) && b.counts.Requested >= 1 && b.data.every((o) => o.status === "Requested")
  );
  check(
    "Admin approves the PO",
    await request("PATCH", `/purchase-orders/${po?._id}/approve`, { token: adminToken }),
    200,
    (b) => b.data.status === "Approved" && b.data.approvedBy.name === "Admin User"
  );
  check(
    "Approving twice → 409",
    await request("PATCH", `/purchase-orders/${po?._id}/approve`, { token: adminToken }),
    409
  );
  check(
    "Cancelling an approved PO → 409",
    await request("PATCH", `/purchase-orders/${po?._id}/cancel`, { token: adminToken }),
    409
  );
  check(
    "Staff marks the PO received (stock IN per item)",
    await request("PATCH", `/purchase-orders/${po?._id}/receive`, { token: staffToken }),
    200,
    (b) => b.data.status === "Received" && b.data.receivedBy.name === "Staff User"
  );
  check(
    "Receiving updated the stock atomically (3 + 20 = 23)",
    await request("GET", `/products/${product?._id}`, { token: staffToken }),
    200,
    (b) =>
      b.data.product.quantity === 23 &&
      b.data.movements[0].type === "IN" &&
      b.data.movements[0].reason === "Purchase" &&
      b.data.movements[0].poNumber === po?.poNumber
  );
  check(
    "Restocking above the reorder level re-arms the low-stock alert",
    await request("GET", `/products/${product?._id}`, { token: staffToken }),
    200,
    (b) => b.data.product.lowStockAlertSentAt === null
  );
  check(
    "Dropping low again sends a new alert (once per low period)",
    await request("POST", "/stock/out", {
      token: staffToken,
      body: { productId: product?._id, quantity: 21, reason: "Sale" },
    }),
    201,
    async () => true
  );
  await request("POST", "/stock/out", {
    token: staffToken,
    body: { productId: product?._id, quantity: 1, reason: "Sale" },
  });
  check(
    "Two alerts in total: none for the sale while it was already low",
    { status: (await alertsFor("Smoke Test Product")) === 2 ? 200 : 0, body: {} },
    200
  );
  check(
    "Receiving twice → 409 (no double stock)",
    await request("PATCH", `/purchase-orders/${po?._id}/receive`, { token: staffToken }),
    409
  );
  check(
    "PO timeline records who did what and when",
    await request("GET", `/purchase-orders/${po?._id}`, { token: staffToken }),
    200,
    (b) =>
      b.data.history.map((h) => h.action).join(",") === "Requested,Approved,Received" &&
      b.data.history.every((h) => h.by?.name && h.at)
  );
  const poToReject = check(
    "Admin requests a second PO",
    await request("POST", "/purchase-orders", {
      token: adminToken,
      body: { supplier: supplier?._id, items: [{ product: product?._id, quantity: 5, unitCost: 90 }] },
    }),
    201
  )?.data;
  check(
    "Reject without a reason → 400",
    await request("PATCH", `/purchase-orders/${poToReject?._id}/reject`, { token: adminToken, body: {} }),
    400
  );
  check(
    "Staff cannot cancel someone else's PO → 403",
    await request("PATCH", `/purchase-orders/${poToReject?._id}/cancel`, { token: staffToken }),
    403
  );
  check(
    "Admin rejects with a reason",
    await request("PATCH", `/purchase-orders/${poToReject?._id}/reject`, {
      token: adminToken,
      body: { reason: "Price too high" },
    }),
    200,
    (b) => b.data.status === "Rejected" && b.data.rejectionReason === "Price too high"
  );
  const poToCancel = check(
    "Staff requests a third PO",
    await request("POST", "/purchase-orders", {
      token: staffToken,
      body: { supplier: supplier?._id, items: [{ product: product?._id, quantity: 2, unitCost: 95 }] },
    }),
    201
  )?.data;
  check(
    "Requester cancels their Requested PO",
    await request("PATCH", `/purchase-orders/${poToCancel?._id}/cancel`, {
      token: staffToken,
      body: { reason: "Ordered by phone instead" },
    }),
    200,
    (b) => b.data.status === "Cancelled"
  );
  check(
    "Receiving a cancelled PO → 409",
    await request("PATCH", `/purchase-orders/${poToCancel?._id}/receive`, { token: staffToken }),
    409
  );
  check("Dashboard includes PO counts", await request("GET", "/dashboard/summary", { token: staffToken }), 200, (b) =>
    Boolean(b.data.purchaseOrders.counts.Received >= 1 && b.data.purchaseOrders.counts.Cancelled >= 1)
  );

  // --- Error handling and authorization ------------------------------------
  check(
    "Invalid ID → 400",
    await request("GET", "/products/not-a-valid-id", { token: adminToken }),
    400,
    (b) => b.message === "Invalid ID"
  );
  check(
    "Unknown product ID → 404",
    await request("GET", "/products/000000000000000000000000", { token: adminToken }),
    404
  );
  check("Unknown route → 404", await request("GET", "/does-not-exist", { token: adminToken }), 404);
  check(
    "Staff creating a category → 403",
    await request("POST", "/categories", { token: staffToken, body: { name: "Not allowed" } }),
    403
  );
  check("Staff listing users → 403", await request("GET", "/users", { token: staffToken }), 403);
  check(
    "Deleting a category that has products → 409",
    await request("DELETE", `/categories/${category?._id}`, { token: adminToken }),
    409
  );
  check(
    "Admin demoting themselves → 400",
    await request("PATCH", `/users/${adminId}`, { token: adminToken, body: { role: "staff" } }),
    400
  );
  check("Admin listing users", await request("GET", "/users", { token: adminToken }), 200);

  // --- Archive module ------------------------------------------------------
  const openPo = check(
    "Staff requests a PO to test the archive rules",
    await request("POST", "/purchase-orders", {
      token: staffToken,
      body: { supplier: supplier?._id, items: [{ product: product?._id, quantity: 1, unitCost: 95 }] },
    }),
    201
  )?.data;
  check(
    "Archiving a product on an open PO → 409",
    await request("PATCH", `/products/${product?._id}/archive`, {
      token: adminToken,
      body: { reason: "Discontinued" },
    }),
    409,
    (b) => b.message.includes(openPo?.poNumber)
  );
  check(
    "Archiving a supplier with an open PO → 409",
    await request("PATCH", `/suppliers/${supplier?._id}/archive`, { token: adminToken, body: { reason: "Closed" } }),
    409
  );
  check(
    "Archiving an open (Requested) PO → 409",
    await request("PATCH", `/purchase-orders/${openPo?._id}/archive`, { token: adminToken, body: { reason: "Old" } }),
    409
  );
  await request("PATCH", `/purchase-orders/${openPo?._id}/cancel`, { token: staffToken });
  check(
    "Archive without a reason → 400",
    await request("PATCH", `/products/${product?._id}/archive`, { token: adminToken, body: {} }),
    400,
    (b) => b.errors[0].field === "reason"
  );
  check(
    "Staff archiving a product → 403",
    await request("PATCH", `/products/${product?._id}/archive`, { token: staffToken, body: { reason: "x" } }),
    403
  );
  check(
    "Admin archives the product (no open POs left)",
    await request("PATCH", `/products/${product?._id}/archive`, {
      token: adminToken,
      body: { reason: "Discontinued by supplier" },
    }),
    200,
    (b) => b.data.archived === true && b.data.archiveReason === "Discontinued by supplier" && Boolean(b.data.archivedAt)
  );
  check(
    "Archiving twice → 409",
    await request("PATCH", `/products/${product?._id}/archive`, { token: adminToken, body: { reason: "Again" } }),
    409
  );
  check(
    "Archived product is hidden from product search",
    await request("GET", `/products?search=${sku}`, { token: staffToken }),
    200,
    (b) => b.total === 0
  );
  check(
    "Archived product cannot be stocked in → 409",
    await request("POST", "/stock/in", {
      token: staffToken,
      body: { productId: product?._id, quantity: 1, reason: "Purchase" },
    }),
    409
  );
  check(
    "Archived product cannot be put on a PO → 400",
    await request("POST", "/purchase-orders", {
      token: staffToken,
      body: { supplier: supplier?._id, items: [{ product: product?._id, quantity: 1, unitCost: 1 }] },
    }),
    400
  );
  check(
    "New product with an archived product's SKU → 409 explains",
    await request("POST", "/products", { token: adminToken, body: { name: "Copy", sku, category: category?._id } }),
    409,
    (b) => b.message.includes("archived product")
  );
  check(
    "Movement history of the archived product is kept",
    await request("GET", `/stock/movements?product=${product?._id}`, { token: staffToken }),
    200,
    (b) => b.total >= 3
  );
  check(
    "Archive page lists the product with who archived it",
    await request("GET", "/archive/products", { token: adminToken }),
    200,
    (b) => b.data.some((p) => p._id === product?._id && p.archivedBy?.name === "Admin User") && b.counts.products >= 1
  );
  check(
    "Staff opening the Archive page API → 403",
    await request("GET", "/archive/products", { token: staffToken }),
    403
  );
  check("Unknown archive type → 404", await request("GET", "/archive/widgets", { token: adminToken }), 404);
  check(
    "Admin restores the product",
    await request("PATCH", `/products/${product?._id}/restore`, { token: adminToken }),
    200,
    (b) => b.data.archived === false && b.data.archiveLog.map((e) => e.action).join(",") === "Archived,Restored"
  );
  check(
    "Restored product is back in search",
    await request("GET", `/products?search=${sku}`, { token: staffToken }),
    200,
    (b) => b.total === 1
  );
  check(
    "Admin archives the supplier",
    await request("PATCH", `/suppliers/${supplier?._id}/archive`, {
      token: adminToken,
      body: { reason: "Closed shop" },
    }),
    200
  );
  check(
    "Archived supplier is hidden from the supplier list (dropdowns)",
    await request("GET", "/suppliers", { token: staffToken }),
    200,
    (b) => !b.data.some((x) => x._id === supplier?._id)
  );
  check(
    "New product with an archived supplier → 400",
    await request("POST", "/products", {
      token: adminToken,
      body: { name: "Y", sku: `Y-${suffix}`, category: category?._id, supplier: supplier?._id },
    }),
    400,
    (b) => b.errors[0].field === "supplier"
  );
  check(
    "Admin archives a received PO",
    await request("PATCH", `/purchase-orders/${po?._id}/archive`, { token: adminToken, body: { reason: "Filed" } }),
    200
  );
  check(
    "Archived PO is hidden from the PO list and its timeline shows Archived",
    await request("GET", `/purchase-orders?search=${po?.poNumber}`, { token: adminToken }),
    200,
    (b) => b.total === 0
  );
  check(
    "Archived PO details keep the full timeline",
    await request("GET", `/purchase-orders/${po?._id}`, { token: adminToken }),
    200,
    (b) => b.data.archived && b.data.history.at(-1).action === "Archived" && b.data.archivedBy.name === "Admin User"
  );
  check(
    "Admin archiving their own account → 400",
    await request("PATCH", `/users/${adminId}/archive`, { token: adminToken, body: { reason: "Test" } }),
    400
  );
  check(
    "Admin archives a user",
    await request("PATCH", `/users/${newUser?._id}/archive`, { token: adminToken, body: { reason: "Resigned" } }),
    200
  );
  check(
    "Archived user cannot log in → 403",
    await request("POST", "/auth/login", { body: { email: newUserEmail, password: "Temp1234" } }),
    403,
    (b) => b.message.includes("archived")
  );
  check("Archived user's existing token → 401", await request("GET", "/auth/me", { token: newUserToken }), 401);
  check(
    "Archived user is hidden from the Users list",
    await request("GET", "/users", { token: adminToken }),
    200,
    (b) => !b.data.some((u) => u._id === newUser?._id)
  );
  check(
    "Hard delete endpoints are gone (DELETE product → 404)",
    await request("DELETE", `/products/${product?._id}`, { token: adminToken }),
    404
  );
  check(
    "Category used only by archived products still cannot be deleted → 409",
    await request("PATCH", `/products/${product?._id}/archive`, {
      token: adminToken,
      body: { reason: "Cleanup" },
    }).then(() => request("DELETE", `/categories/${category?._id}`, { token: adminToken })),
    409,
    (b) => b.message.includes("archived")
  );

  const failed = results.filter((r) => !r.passed).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed${failed ? `, ${failed} FAILED` : ""}.`);
  process.exitCode = failed ? 1 : 0;
};

run().catch((error) => {
  console.error(`Smoke test aborted: ${error.message}`);
  process.exitCode = 1;
});
