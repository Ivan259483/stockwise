/**
 * End-to-end smoke test for a running StockWise API.
 *
 * Exercises authentication, CRUD, stock in/out and the main error paths, and
 * prints PASS/FAIL per check. It creates its own temporary category, supplier
 * and product and deletes them at the end (their stock movements remain, as
 * the audit log is append-only by design).
 *
 * Usage:
 *   npm run smoke                                   # http://localhost:5050/api
 *   API_URL=https://your-api.vercel.app/api npm run smoke
 */

const API_URL = (process.env.API_URL ?? process.argv[2] ?? "http://localhost:5050/api").replace(/\/$/, "");
const ADMIN = { email: "admin@stockwise.com", password: "Admin123!" };
const STAFF = { email: "staff@stockwise.com", password: "Staff123!" };

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

  check("GET /health returns ok", await request("GET", "/health"), 200, (b) => b.data.status === "ok");

  // --- Authentication ------------------------------------------------------
  const adminLogin = check("Admin login", await request("POST", "/auth/login", { body: ADMIN }), 200, (b) =>
    Boolean(b.data.token && b.data.user.role === "admin" && b.data.user.password === undefined)
  );
  const adminToken = adminLogin?.data?.token;
  const staffLogin = check("Staff login", await request("POST", "/auth/login", { body: STAFF }), 200);
  const staffToken = staffLogin?.data?.token;

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
  const adminId = adminLogin?.data?.user?._id;
  check(
    "Admin demoting themselves → 400",
    await request("PATCH", `/users/${adminId}`, { token: adminToken, body: { role: "staff" } }),
    400
  );
  check("Admin listing users", await request("GET", "/users", { token: adminToken }), 200);

  // --- Cleanup (also verifies the delete endpoints) ------------------------
  check(
    "Delete supplier (unsets it on products)",
    await request("DELETE", `/suppliers/${supplier?._id}`, { token: adminToken }),
    200,
    (b) => b.data.productsUpdated === 1
  );
  check("Delete product", await request("DELETE", `/products/${product?._id}`, { token: adminToken }), 200);
  check(
    "Delete category (now empty)",
    await request("DELETE", `/categories/${category?._id}`, { token: adminToken }),
    200
  );

  const failed = results.filter((r) => !r.passed).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed${failed ? `, ${failed} FAILED` : ""}.`);
  process.exitCode = failed ? 1 : 0;
};

run().catch((error) => {
  console.error(`Smoke test aborted: ${error.message}`);
  process.exitCode = 1;
});
