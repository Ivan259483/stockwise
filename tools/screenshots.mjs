/**
 * Captures the documentation screenshots with headless Chrome at 1440 px
 * (desktop) and 390 px (mobile), using the presentation data (npm run seed).
 * Read-only: forms and dialogs are filled in and photographed but never
 * submitted (the insufficient-stock attempt is rejected by the API by design).
 * The two email screenshots are rendered from the real email templates.
 *
 * Usage: node screenshots.mjs [baseUrl] [apiUrl]
 *        defaults: http://localhost:5173 and http://localhost:5050 (local demo stack);
 *        pass the Vercel URLs to capture the live site instead.
 * Output: ../docs/screenshots/*.png
 */
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { lowStockEmail, passwordResetEmail } from "../server/services/emailTemplates.js";
import { clickText, DESKTOP, fill, launch, login, MOBILE, resetSession, waitForText } from "./lib/browser.mjs";

const BASE_URL = (process.argv[2] ?? "http://localhost:5173").replace(/\/$/, "");
const API_URL = (process.argv[3] ?? process.env.API_URL ?? "http://localhost:5050").replace(/\/$/, "");
// fileURLToPath decodes the path (the project folder name contains a space).
const OUT = fileURLToPath(new URL("../docs/screenshots/", import.meta.url));
const ADMIN = ["roberto.santos@santosfamilyhw-demo.com", "Admin123!"];
const STAFF = ["kristine.villanueva@santosfamilyhw-demo.com", "Staff123!"];

/** Waits for toasts to disappear and animations to settle, then saves a PNG. */
const shot = async (page, name, { keepToasts = false, fullPage = false } = {}) => {
  if (!keepToasts) {
    await page
      .waitForFunction(() => !document.querySelector("[role=status][aria-live]")?.innerText, { timeout: 8000 })
      .catch(() => {});
  }
  await new Promise((resolve) => setTimeout(resolve, 600));
  await page.screenshot({ path: `${OUT}${name}.png`, fullPage });
  console.log(`saved ${name}.png`);
};

const open = (page, path) => page.goto(`${BASE_URL}${path}`, { waitUntil: "networkidle0" });

/** GET from the API with the logged-in session's token. */
const apiGet = (page, path) =>
  page.evaluate(async (url) => {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${localStorage.getItem("stockwise_token")}` },
    });
    return response.json();
  }, `${API_URL}/api${path}`);

const productIdBySku = async (page, sku) => (await apiGet(page, `/products?search=${sku}`)).data[0]._id;
const firstPoId = async (page, status) => (await apiGet(page, `/purchase-orders?status=${status}&limit=1`)).data[0]._id;

/** Renders an email template in the browser at a mail-client-like width. */
const emailShot = async (page, name, { subject, html }) => {
  await page.setViewport({ width: 760, height: 720 });
  await page.setContent(
    `<div style="font:13px Arial;padding:10px 16px;background:#fff;border-bottom:1px solid #e2e8f0"><b>Subject:</b> ${subject}</div>${html}`,
    { waitUntil: "load" }
  );
  await shot(page, name, { fullPage: true });
};

const run = async () => {
  await mkdir(OUT, { recursive: true });
  const browser = await launch();
  const page = await browser.newPage();

  // ------------------------------------------------------------ Signed out (1440)
  await page.setViewport(DESKTOP);
  await resetSession(page, BASE_URL);
  await open(page, "/login");
  await shot(page, "01-login");

  await open(page, "/register");
  await clickText(page, "Create account", 'button[type="submit"]');
  await waitForText(page, "Name is required");
  await shot(page, "02-register-validation");

  await open(page, "/forgot-password");
  await fill(page, 'input[name="email"]', "ivantadena21@gmail.com");
  await shot(page, "19-forgot-password");

  await open(page, "/reset-password?email=ivantadena21%40gmail.com");
  await fill(page, 'input[name="code"]', "482915");
  await shot(page, "20-reset-password");

  // ------------------------------------------------------------ Admin
  await login(page, BASE_URL, ...ADMIN);
  await page.waitForSelector(".recharts-surface");
  await new Promise((resolve) => setTimeout(resolve, 1500)); // let the chart animations finish
  await shot(page, "03-dashboard");
  // A tall viewport instead of fullPage, so the charts do not re-animate during capture.
  await page.setViewport({ ...DESKTOP, height: 1400 });
  await new Promise((resolve) => setTimeout(resolve, 1500));
  await shot(page, "03b-dashboard-full");
  await page.setViewport(DESKTOP);

  await open(page, "/products");
  await waitForText(page, "products found");
  await shot(page, "04-products-desktop");

  await open(page, "/products?status=low_stock");
  await waitForText(page, "products found");
  await shot(page, "05-products-low-stock-filter");

  await open(page, "/products/new");
  await waitForText(page, "Opening quantity");
  await fill(page, 'input[name="sku"]', "bad sku!");
  await fill(page, 'input[name="costPrice"]', "-5");
  await clickText(page, "Create product", 'button[type="submit"]');
  await waitForText(page, "Product name is required");
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot(page, "06-product-form-validation", { keepToasts: true });

  const hammerId = await productIdBySku(page, "HT-HAM-016");
  await open(page, `/products/${hammerId}`);
  await waitForText(page, "Movement history");
  await shot(page, "07-product-details", { fullPage: true });

  await clickText(page, "Stock in");
  await page.waitForSelector('[role="dialog"] input[name="quantity"]');
  await fill(page, '[role="dialog"] input[name="quantity"]', "12");
  await page.select('[role="dialog"] select[name="reason"]', "Return");
  await fill(page, '[role="dialog"] textarea[name="note"]', "Customer returned unopened item");
  await shot(page, "08-stock-movement-modal");
  await clickText(page, "Cancel", '[role="dialog"] button');

  const screwdriverId = await productIdBySku(page, "HT-SCR-006");
  await open(page, `/products/${screwdriverId}`);
  await waitForText(page, "Movement history");
  await clickText(page, "Stock out");
  await fill(page, '[role="dialog"] input[name="quantity"]', "500");
  await clickText(page, "Record stock out", '[role="dialog"] button');
  await waitForText(page, "Insufficient stock: only");
  await shot(page, "09-insufficient-stock", { keepToasts: true });
  await clickText(page, "Cancel", '[role="dialog"] button');

  await open(page, "/movements");
  await waitForText(page, "movements recorded");
  await shot(page, "10-stock-movements");

  await open(page, "/categories");
  await waitForText(page, "Hand Tools");
  await shot(page, "11-categories");

  await open(page, "/suppliers");
  await waitForText(page, "Binondo Hardware");
  await shot(page, "12-suppliers");

  await open(page, "/users");
  await waitForText(page, "Kristine Mae Villanueva");
  await shot(page, "13-users");
  await clickText(page, "Add user");
  await page.waitForSelector('[role="dialog"] input[name="name"]');
  await fill(page, '[role="dialog"] input[name="name"]', "Joel Pascual");
  await fill(page, '[role="dialog"] input[name="email"]', "joel.pascual@santosfamilyhw-demo.com");
  await fill(page, '[role="dialog"] input[name="password"]', "Welcome2026");
  await shot(page, "21-users-add-user");
  await clickText(page, "Cancel", '[role="dialog"] button');

  // Purchase orders
  await open(page, "/purchase-orders");
  await waitForText(page, "PO-");
  await shot(page, "22-purchase-orders");

  const padlockId = await productIdBySku(page, "FH-PAD-040");
  await open(page, `/purchase-orders/new?product=${padlockId}`);
  await fill(page, 'input[name="items[0].quantity"]', "12");
  await clickText(page, "Add item");
  await page.waitForFunction(() => document.querySelector('select[name="items[1].product"]'));
  const gogglesValue = await page.$eval(
    'select[name="items[1].product"]',
    (s) => [...s.options].find((o) => o.text.startsWith("Safety Goggles")).value
  );
  await page.select('select[name="items[1].product"]', gogglesValue);
  await fill(page, 'input[name="items[1].quantity"]', "24");
  await fill(page, 'textarea[name="notes"]', "Quotation #BHT-2210 from Binondo Hardware");
  await shot(page, "23-purchase-order-form");

  await open(page, `/purchase-orders/${await firstPoId(page, "Requested")}`);
  await waitForText(page, "Timeline");
  await shot(page, "24-purchase-order-requested");
  await clickText(page, "Reject");
  await fill(page, '[role="dialog"] textarea[name="reason"]', "Wait for the new price list next week");
  await shot(page, "26-purchase-order-reject-dialog");
  await clickText(page, "Cancel", '[role="dialog"] button');

  await open(page, `/purchase-orders/${await firstPoId(page, "Approved")}`);
  await clickText(page, "Mark as received");
  await shot(page, "25-purchase-order-receive-dialog");
  await clickText(page, "Cancel", '[role="dialog"] button');

  await open(page, `/purchase-orders/${await firstPoId(page, "Received")}`);
  await waitForText(page, "Received into stock by");
  await shot(page, "27-purchase-order-received");

  await open(page, `/purchase-orders/${await firstPoId(page, "Rejected")}`);
  await waitForText(page, "Rejected by");
  await shot(page, "28-purchase-order-rejected");

  // Archive
  await open(page, "/products?search=Claw");
  await clickText(page, "Archive Claw Hammer");
  await fill(page, '[role="dialog"] textarea[name="reason"]', "Discontinued by the supplier");
  await shot(page, "29-archive-reason-dialog");
  await clickText(page, "Cancel", '[role="dialog"] button');

  await open(page, "/archive");
  await waitForText(page, "Incandescent Bulb");
  await shot(page, "30-archive-products");
  await clickText(page, "View Incandescent Bulb");
  await waitForText(page, "Archive history");
  await shot(page, "31-archive-view");
  await clickText(page, "Close dialog");

  await open(page, "/archive?type=purchase-orders");
  await waitForText(page, "PO-");
  await shot(page, "32-archive-purchase-orders");

  const bulbId = (await apiGet(page, "/archive/products?search=EL-INC")).data[0]._id;
  await open(page, `/products/${bulbId}`);
  await waitForText(page, "This product is archived.");
  await shot(page, "33-archived-product");

  // ------------------------------------------------------------ Staff
  await resetSession(page, BASE_URL);
  await login(page, BASE_URL, ...STAFF);
  await open(page, "/products");
  await waitForText(page, "products found");
  await shot(page, "14-products-staff-view");

  await open(page, "/profile");
  await waitForText(page, "Personal information");
  await shot(page, "18-profile");

  await open(page, `/purchase-orders/${await firstPoId(page, "Requested")}`);
  await waitForText(page, "Waiting for an admin to approve");
  await shot(page, "34-purchase-order-staff-view");

  // ------------------------------------------------------------ Mobile (390)
  await page.setViewport(MOBILE);
  await open(page, "/");
  await page.waitForSelector(".recharts-surface");
  await new Promise((resolve) => setTimeout(resolve, 1500));
  await shot(page, "15-dashboard-mobile");
  await open(page, "/products");
  await waitForText(page, "products found");
  await shot(page, "16-products-mobile");
  await page.click('button[aria-label="Open navigation"]');
  await new Promise((resolve) => setTimeout(resolve, 400));
  await shot(page, "17-navigation-drawer-mobile");
  await open(page, "/purchase-orders");
  await waitForText(page, "PO-");
  await shot(page, "35-purchase-orders-mobile");

  // ------------------------------------------------------------ Emails (rendered from the templates)
  await emailShot(page, "36-email-reset-code", passwordResetEmail({ name: "Ivan Tadena", code: "482915" }));
  await emailShot(
    page,
    "37-email-low-stock",
    lowStockEmail({
      product: { _id: "demo", name: "Paint Thinner 1 L", sku: "PA-THN-001", quantity: 0, unit: "L", reorderLevel: 10 },
      appUrl: "https://stockwise-ivan.vercel.app",
    })
  );

  await browser.close();
};

run().catch((error) => {
  console.error(`Screenshot capture failed: ${error.message}`);
  process.exitCode = 1;
});
