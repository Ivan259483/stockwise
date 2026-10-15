/**
 * Headless-Chrome end-to-end test of the StockWise web app, for both roles.
 *
 * Covers login (including validation and wrong password), password recovery
 * with the emailed code, the profile page, dashboard, product CRUD with client-
 * and server-side validation errors, stock in, an insufficient stock out,
 * categories, suppliers, user management, role restrictions, the 375px mobile
 * layout, refreshing a nested route, and session expiry.
 *
 * It only runs against the TEST stack (client `npm run dev:test` on :5174, API
 * `npm run dev:test` on :5051 with the stockwise_test database): it checks the
 * API's database name first and aborts unless it ends in "_test". Reset codes
 * are read from the test API's mail outbox (server/tmp/outbox.jsonl).
 *
 * Usage: node e2e.mjs [baseUrl] [apiUrl]   (defaults http://localhost:5174, http://localhost:5051)
 * Simplest: node run-tests.mjs (seeds, starts both servers, runs smoke + E2E).
 * A failing step saves a screenshot in tools/e2e-failures/.
 */
import { mkdir, readFile } from "node:fs/promises";
import {
  clickText,
  DESKTOP,
  fill,
  hasHorizontalOverflow,
  launch,
  login,
  resetSession,
  waitForNoText,
  waitForText,
} from "./lib/browser.mjs";

const BASE_URL = (process.argv[2] ?? process.env.BASE_URL ?? "http://localhost:5174").replace(/\/$/, "");
const API_URL = (process.argv[3] ?? process.env.API_URL ?? "http://localhost:5051").replace(/\/$/, "");
const OUTBOX_FILE = new URL("../server/tmp/outbox.jsonl", import.meta.url);
const ADMIN = ["admin@stockwise.test", "Admin123!"];
const STAFF = ["staff@stockwise.test", "Staff123!"];
const RECOVERY_EMAIL = "e2e.recovery@stockwise.test";
const SUFFIX = Date.now().toString(36).toUpperCase().slice(-5);
const SKU = `E2E-${SUFFIX}`;
const PRODUCT_NAME = `E2E Test Product ${SUFFIX}`;
const CATEGORY_NAME = `E2E Category ${SUFFIX}`;
const SUPPLIER_NAME = `E2E Supplier ${SUFFIX}`;
const NEW_USER_NAME = `E2E User ${SUFFIX}`;
const NEW_USER_EMAIL = `e2e.user.${SUFFIX.toLowerCase()}@stockwise.test`;

const results = [];
let page;

/** Runs one named step, records PASS/FAIL and keeps going after a failure. */
const step = async (name, fn) => {
  try {
    await fn();
    results.push({ name, passed: true });
    console.log(`PASS  ${name}`);
  } catch (error) {
    results.push({ name, passed: false });
    console.log(`FAIL  ${name}\n      ${error.message.split("\n")[0]}`);
    await mkdir("e2e-failures", { recursive: true });
    await page.screenshot({ path: `e2e-failures/${results.length}-${name.replace(/\W+/g, "-")}.png` }).catch(() => {});
  }
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

/** Opens a page via the address bar (full reload), like a user refreshing. */
const open = (path) => page.goto(`${BASE_URL}${path}`, { waitUntil: "networkidle0" });

/** The 6-digit code in the latest reset email the test API "sent" to `email`. */
const latestResetCode = async (email) => {
  const text = await readFile(OUTBOX_FILE, "utf8").catch(() => "");
  const messages = text
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .filter((message) => message.to.includes(email));
  return messages.at(-1)?.text.match(/\b(\d{6})\b/)?.[1] ?? null;
};

/** Refuses to run unless the API is connected to a *_test database. */
const assertTestDatabase = async () => {
  const health = await fetch(`${API_URL}/api/health`).then((r) => r.json());
  const name = health?.data?.databaseName ?? "";
  if (!name.endsWith("_test")) {
    throw new Error(`API at ${API_URL} uses database "${name || "unknown"}"; E2E only runs against a *_test database`);
  }
};

const run = async () => {
  console.log(`StockWise E2E → ${BASE_URL} (API ${API_URL})\n`);
  await assertTestDatabase();
  const browser = await launch();
  page = await browser.newPage();
  await page.setViewport(DESKTOP);
  let productUrl = "";

  // ---------------------------------------------------------------- Auth
  await step("Login form shows inline errors when empty", async () => {
    await resetSession(page, BASE_URL);
    await open("/login");
    await clickText(page, "Sign in", 'button[type="submit"]');
    await waitForText(page, "Email is required");
    await waitForText(page, "Password is required");
  });

  await step("Wrong password shows an error toast", async () => {
    await fill(page, 'input[name="email"]', ADMIN[0]);
    await fill(page, 'input[name="password"]', "WrongPass1");
    await clickText(page, "Sign in", 'button[type="submit"]');
    await waitForText(page, "Invalid email or password");
  });

  await step("Login page shows the store name and a Forgot password link", async () => {
    await open("/login");
    await waitForText(page, "Santos Family Hardware");
    await waitForText(page, "Forgot password?");
  });

  await step("Password recovery: emailed 6-digit code resets the password", async () => {
    await clickText(page, "Forgot password?", "a");
    await waitForText(page, "Forgot your password?");
    await clickText(page, "Send reset code", 'button[type="submit"]');
    await waitForText(page, "Email is required");
    await fill(page, 'input[name="email"]', RECOVERY_EMAIL);
    await clickText(page, "Send reset code", 'button[type="submit"]');
    await waitForText(page, "If an account with that email exists");
    const code = await latestResetCode(RECOVERY_EMAIL);
    assert(code, "no reset code found in the test outbox");
    await fill(page, 'input[name="code"]', code === "000000" ? "111111" : "000000");
    await fill(page, 'input[name="password"]', "Recovered123");
    await fill(page, 'input[name="confirmPassword"]', "Recovered123");
    await clickText(page, "Reset password", 'button[type="submit"]');
    await waitForText(page, "attempts left");
    await fill(page, 'input[name="code"]', code);
    await clickText(page, "Reset password", 'button[type="submit"]');
    await page.waitForFunction(() => location.pathname === "/login", { timeout: 15000 });
    await waitForText(page, "Your password has been reset");
    await login(page, BASE_URL, RECOVERY_EMAIL, "Recovered123");
    await resetSession(page, BASE_URL);
  });

  await step("Protected page redirects to /login when signed out", async () => {
    await open("/products");
    assert(page.url().endsWith("/login"), `expected /login, got ${page.url()}`);
  });

  await step("Admin logs in and sees the dashboard", async () => {
    await login(page, BASE_URL, ...ADMIN);
    for (const text of [
      "Total stock value",
      "Low stock",
      "Out of stock",
      "Stock value by category",
      "Needs restocking",
    ]) {
      await waitForText(page, text);
    }
    assert(await page.$(".recharts-surface"), "charts did not render");
  });

  await step("Admin sees the Users link and role badge", async () => {
    const nav = await page.$eval("#app-sidebar", (el) => el.innerText);
    assert(nav.includes("Users"), "Users link missing for admin");
    await waitForText(page, "admin");
  });

  // ---------------------------------------------------------------- Products
  await step("Products search (debounced) filters the list", async () => {
    await open("/products");
    await waitForText(page, "products found");
    await page.type('input[type="search"]', "hammer");
    await page.waitForFunction(() => location.search.includes("search=hammer"), { timeout: 5000 });
    await waitForText(page, "1 product found");
    await waitForText(page, "Claw Hammer 16 oz");
  });

  await step("Products status filter shows only out-of-stock items", async () => {
    await open("/products?status=out_of_stock");
    await waitForText(page, "3 products found");
    const badges = await page.$$eval("table tbody tr", (rows) => rows.map((r) => r.innerText));
    assert(
      badges.every((text) => text.includes("Out of stock")),
      "non out-of-stock row present"
    );
  });

  await step("Product form shows client-side validation errors", async () => {
    await open("/products/new");
    await waitForText(page, "Opening quantity");
    await clickText(page, "Create product", 'button[type="submit"]');
    await waitForText(page, "Product name is required");
    await waitForText(page, "SKU is required");
    await waitForText(page, "Please choose a category");
  });

  await step("Admin creates a product", async () => {
    await fill(page, 'input[name="name"]', PRODUCT_NAME);
    await fill(page, 'input[name="sku"]', SKU);
    const categoryValue = await page.$eval('select[name="category"]', (s) => s.options[1].value);
    await page.select('select[name="category"]', categoryValue);
    await fill(page, 'input[name="costPrice"]', "100");
    await fill(page, 'input[name="sellingPrice"]', "150");
    await fill(page, 'input[name="quantity"]', "5");
    await fill(page, 'input[name="reorderLevel"]', "2");
    await clickText(page, "Create product", 'button[type="submit"]');
    await page.waitForFunction((sku) => document.body.innerText.includes(`SKU ${sku}`), { timeout: 15000 }, SKU);
    productUrl = new URL(page.url()).pathname;
    await waitForText(page, "Opening stock");
  });

  await step("Duplicate SKU shows the server's field error", async () => {
    await open("/products/new");
    await fill(page, 'input[name="name"]', "Duplicate SKU Product");
    await fill(page, 'input[name="sku"]', SKU);
    const categoryValue = await page.$eval('select[name="category"]', (s) => s.options[1].value);
    await page.select('select[name="category"]', categoryValue);
    await fill(page, 'input[name="costPrice"]', "1");
    await fill(page, 'input[name="sellingPrice"]', "1");
    await clickText(page, "Create product", 'button[type="submit"]');
    await waitForText(page, "SKU already exists");
    assert(page.url().endsWith("/products/new"), "should stay on the form");
  });

  await step("Refreshing a nested route (/products/:id) loads the page", async () => {
    await open(productUrl);
    await waitForText(page, PRODUCT_NAME);
    await waitForText(page, "Movement history");
  });

  await step("Stock in +10 updates the quantity", async () => {
    await clickText(page, "Stock in");
    await page.waitForSelector('[role="dialog"] input[name="quantity"]', { visible: true });
    await fill(page, '[role="dialog"] input[name="quantity"]', "10");
    await clickText(page, "Record stock in", '[role="dialog"] button');
    await waitForText(page, "now has 15");
    await waitForNoText(page, "Record stock movement");
  });

  await step("Stock out above available stock is rejected (409, inline error)", async () => {
    await clickText(page, "Stock out");
    await page.waitForSelector('[role="dialog"] input[name="quantity"]', { visible: true });
    await fill(page, '[role="dialog"] input[name="quantity"]', "999");
    await clickText(page, "Record stock out", '[role="dialog"] button');
    await waitForText(page, "Insufficient stock: only 15 available");
    const dialogText = await page.$eval('[role="dialog"]', (el) => el.innerText);
    assert(dialogText.includes("Insufficient stock"), "error not shown inside the modal");
  });

  await step("Valid stock out −4 succeeds", async () => {
    await fill(page, '[role="dialog"] input[name="quantity"]', "4");
    await clickText(page, "Record stock out", '[role="dialog"] button');
    await waitForText(page, "now has 11");
  });

  await step("Admin edits the product", async () => {
    await open(`${productUrl}/edit`);
    await waitForText(page, "Current quantity");
    await fill(page, 'input[name="sellingPrice"]', "175");
    await clickText(page, "Save changes", 'button[type="submit"]');
    await waitForText(page, "Product updated");
    await waitForText(page, "₱175.00");
  });

  // ---------------------------------------------------------------- Stock movements page
  await step("Stock movements page filters by product", async () => {
    await open(`/movements?product=${productUrl.split("/").pop()}`);
    await waitForText(page, "3 movements recorded");
  });

  // ---------------------------------------------------------------- Categories
  await step("Category form validation and create", async () => {
    await open("/categories");
    await clickText(page, "Add category");
    await page.waitForSelector('[role="dialog"]');
    await clickText(page, "Add category", '[role="dialog"] button[type="submit"]');
    await waitForText(page, "Category name is required");
    await fill(page, '[role="dialog"] input[name="name"]', CATEGORY_NAME);
    await clickText(page, "Add category", '[role="dialog"] button[type="submit"]');
    await waitForText(page, "Category created");
    await waitForText(page, CATEGORY_NAME);
  });

  await step("Duplicate category name is rejected (409)", async () => {
    await clickText(page, "Add category");
    await fill(page, '[role="dialog"] input[name="name"]', CATEGORY_NAME.toLowerCase());
    await clickText(page, "Add category", '[role="dialog"] button[type="submit"]');
    await waitForText(page, "Category name already exists");
    await clickText(page, "Cancel", '[role="dialog"] button');
  });

  await step("Category in use cannot be deleted (409)", async () => {
    await clickText(page, "Delete Hand Tools");
    await clickText(page, "Delete", '[role="dialog"] button');
    await waitForText(page, "product(s) still use this category");
  });

  await step("Admin edits and deletes the test category", async () => {
    await clickText(page, `Edit ${CATEGORY_NAME}`);
    await fill(page, '[role="dialog"] textarea[name="description"]', "Edited by E2E");
    await clickText(page, "Save changes", '[role="dialog"] button');
    await waitForText(page, "Edited by E2E");
    await clickText(page, `Delete ${CATEGORY_NAME}`);
    await clickText(page, "Delete", '[role="dialog"] button');
    await waitForText(page, `"${CATEGORY_NAME}" deleted`);
  });

  // ---------------------------------------------------------------- Suppliers
  await step("Supplier validation, create and delete", async () => {
    await open("/suppliers");
    await clickText(page, "Add supplier");
    await fill(page, '[role="dialog"] input[name="name"]', SUPPLIER_NAME);
    await fill(page, '[role="dialog"] input[name="email"]', "not-an-email");
    await clickText(page, "Add supplier", '[role="dialog"] button[type="submit"]');
    await waitForText(page, "Please enter a valid email address");
    await fill(page, '[role="dialog"] input[name="email"]', "e2e@example.com");
    await clickText(page, "Add supplier", '[role="dialog"] button[type="submit"]');
    await waitForText(page, "Supplier created");
    await clickText(page, `Delete ${SUPPLIER_NAME}`);
    await clickText(page, "Delete", '[role="dialog"] button');
    await waitForText(page, `"${SUPPLIER_NAME}" deleted`);
  });

  // ---------------------------------------------------------------- Users
  await step("Users page lists accounts; own controls are disabled", async () => {
    await open("/users");
    await waitForText(page, "staff@stockwise.test");
    const ownSelectDisabled = await page.$eval('select[aria-label="Role for Admin User"]', (s) => s.disabled);
    assert(ownSelectDisabled, "admin can change their own role");
  });

  await step("Admin adds a user (with validation) and edits their role", async () => {
    await clickText(page, "Add user");
    await page.waitForSelector('[role="dialog"] input[name="name"]', { visible: true });
    await clickText(page, "Add user", '[role="dialog"] button[type="submit"]');
    await waitForText(page, "Name is required");
    await fill(page, '[role="dialog"] input[name="name"]', NEW_USER_NAME);
    await fill(page, '[role="dialog"] input[name="email"]', NEW_USER_EMAIL);
    await fill(page, '[role="dialog"] input[name="password"]', "Temp1234");
    await clickText(page, "Add user", '[role="dialog"] button[type="submit"]');
    await waitForText(page, `${NEW_USER_NAME} can now sign in`);
    await clickText(page, `Edit ${NEW_USER_NAME}`);
    await page.waitForSelector('[role="dialog"] select[name="role"]', { visible: true });
    await page.select('[role="dialog"] select[name="role"]', "admin");
    await clickText(page, "Save changes", '[role="dialog"] button');
    await waitForText(page, `${NEW_USER_NAME} was updated`);
    await page.waitForFunction(
      (name) => document.querySelector(`select[aria-label="Role for ${name}"]`)?.value === "admin",
      { timeout: 15000 },
      NEW_USER_NAME
    );
  });

  // ---------------------------------------------------------------- Mobile
  await step("Mobile 375px: no horizontal scroll and hamburger drawer works", async () => {
    await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
    for (const path of [
      "/",
      "/products",
      "/movements",
      "/categories",
      "/suppliers",
      "/users",
      "/profile",
      productUrl,
    ]) {
      await open(path);
      assert(!(await hasHorizontalOverflow(page)), `horizontal overflow on ${path}`);
    }
    await open("/products");
    const cardsVisible = await page.$eval("ul[aria-label='Products']", (el) => el.offsetParent !== null);
    assert(cardsVisible, "mobile product cards not shown");
    await page.click('button[aria-label="Open navigation"]');
    await page.waitForFunction(() => document.querySelector("#app-sidebar").getBoundingClientRect().left >= 0);
    await page.evaluate(() =>
      [...document.querySelectorAll("#app-sidebar a")].find((a) => a.innerText.includes("Suppliers")).click()
    );
    await waitForText(page, "The vendors you buy stock from.");
    await page.setViewport(DESKTOP);
  });

  // ---------------------------------------------------------------- Cleanup as admin
  await step("Admin deletes the test product", async () => {
    await open(productUrl);
    await clickText(page, "Delete product");
    await clickText(page, "Delete", '[role="dialog"] button');
    await page.waitForFunction(() => location.pathname === "/products", { timeout: 15000 });
    await waitForText(page, "deleted");
  });

  // ---------------------------------------------------------------- Staff
  await step("Staff logs in: no Users link and no Add product button", async () => {
    await resetSession(page, BASE_URL);
    await login(page, BASE_URL, ...STAFF);
    const nav = await page.$eval("#app-sidebar", (el) => el.innerText);
    assert(!nav.includes("Users"), "staff can see the Users link");
    await open("/products");
    await waitForText(page, "products found");
    assert(!(await page.evaluate(() => document.body.innerText.includes("Add product"))), "staff sees Add product");
  });

  await step("Staff edits their profile name; wrong current password is rejected", async () => {
    await open("/profile");
    await waitForText(page, "Personal information");
    await fill(page, 'input[name="name"]', "Staff Member Renamed");
    await clickText(page, "Save changes", 'button[type="submit"]');
    await waitForText(page, "Profile updated");
    const header = await page.$eval("header", (el) => el.innerText);
    assert(header.includes("Staff Member Renamed"), "header did not show the new name");
    await fill(page, 'input[name="name"]', "Staff User");
    await clickText(page, "Save changes", 'button[type="submit"]');
    await waitForText(page, "Profile updated");
    await fill(page, 'input[name="currentPassword"]', "WrongPass1");
    await fill(page, 'input[name="newPassword"]', "NewStaff123");
    await fill(page, 'input[name="confirmPassword"]', "NewStaff123");
    await clickText(page, "Change password", 'button[type="submit"]');
    await waitForText(page, "Current password is incorrect");
  });

  await step("Staff opening an admin URL is redirected", async () => {
    await open("/users");
    await waitForText(page, "That page is for administrators only.");
    assert(new URL(page.url()).pathname === "/", `expected /, got ${page.url()}`);
  });

  await step("Staff records a stock movement from the movements page", async () => {
    await open("/movements");
    await clickText(page, "Record movement");
    await page.waitForSelector('[role="dialog"] select[name="productId"]');
    await page.waitForFunction(
      () => document.querySelector('[role="dialog"] select[name="productId"]').options.length > 1
    );
    const value = await page.$eval(
      '[role="dialog"] select[name="productId"]',
      (s) => [...s.options].find((o) => o.text.startsWith("LED Bulb")).value
    );
    await page.select('[role="dialog"] select[name="productId"]', value);
    await fill(page, '[role="dialog"] input[name="quantity"]', "1");
    await clickText(page, "Record stock in", '[role="dialog"] button');
    await waitForText(page, "LED Bulb 9W Daylight now has");
  });

  await step("Staff stock out above available on an out-of-stock item is rejected", async () => {
    await open("/products?status=out_of_stock");
    await waitForText(page, "Adjustable Wrench");
    await page.evaluate(() =>
      [...document.querySelectorAll("table a")].find((a) => a.innerText.includes("Adjustable Wrench")).click()
    );
    await waitForText(page, "Movement history");
    await clickText(page, "Stock out");
    await fill(page, '[role="dialog"] input[name="quantity"]', "1");
    await clickText(page, "Record stock out", '[role="dialog"] button');
    await waitForText(page, "Insufficient stock: only 0 available");
  });

  await step("Expired/invalid token sends the user back to /login", async () => {
    await page.evaluate(() => localStorage.setItem("stockwise_token", "invalid.token.value"));
    await open("/products");
    await page.waitForFunction(() => location.pathname === "/login", { timeout: 15000 });
  });

  await step("Unknown URL shows the 404 page", async () => {
    await open("/this-page-does-not-exist");
    await waitForText(page, "Page not found");
  });

  await browser.close();

  const failed = results.filter((r) => !r.passed).length;
  console.log(`\n${results.length - failed}/${results.length} E2E steps passed${failed ? `, ${failed} FAILED` : ""}.`);
  process.exitCode = failed ? 1 : 0;
};

run().catch((error) => {
  console.error(`E2E aborted: ${error.message}`);
  process.exitCode = 1;
});
