/**
 * Captures the documentation screenshots from the LIVE site with headless Chrome,
 * at 1440 px (desktop) and 390 px (mobile). Read-only: it never changes data
 * (the insufficient-stock attempt is rejected by the API by design).
 *
 * Usage: [API_URL=...] node screenshots.mjs [baseUrl]   (default https://stockwise-ivan.vercel.app)
 * Output: ../docs/screenshots/*.png
 */
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { clickText, DESKTOP, fill, launch, login, MOBILE, resetSession, waitForText } from "./lib/browser.mjs";

const BASE_URL = (process.argv[2] ?? "https://stockwise-ivan.vercel.app").replace(/\/$/, "");
const API_URL = process.env.API_URL ?? "https://stockwise-api-ivan.vercel.app";
// fileURLToPath decodes the path (the project folder name contains a space).
const OUT = fileURLToPath(new URL("../docs/screenshots/", import.meta.url));

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

/** Looks up a product id by SKU through the API, using the logged-in session's token. */
const productIdBySku = (page, sku) =>
  page.evaluate(
    async (apiUrl, apiSku) => {
      const response = await fetch(`${apiUrl}/api/products?search=${apiSku}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("stockwise_token")}` },
      });
      return (await response.json()).data[0]._id;
    },
    API_URL,
    sku
  );

const run = async () => {
  await mkdir(OUT, { recursive: true });
  const browser = await launch();
  const page = await browser.newPage();

  // ------------------------------------------------------------ Desktop (1440)
  await page.setViewport(DESKTOP);
  await resetSession(page, BASE_URL);
  await open(page, "/login");
  await shot(page, "01-login");

  await open(page, "/register");
  await clickText(page, "Create account", 'button[type="submit"]');
  await waitForText(page, "Name is required");
  await shot(page, "02-register-validation");

  await login(page, BASE_URL, "admin@stockwise.com", "Admin123!");
  await page.waitForSelector(".recharts-surface");
  await shot(page, "03-dashboard");
  await shot(page, "03b-dashboard-full", { fullPage: true });

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
  await page.select('[role="dialog"] select[name="reason"]', "Purchase");
  await fill(page, '[role="dialog"] textarea[name="note"]', "PO #1026 from Manila Hardware");
  await shot(page, "08-stock-movement-modal");
  await clickText(page, "Cancel", '[role="dialog"] button');

  const screwdriverId = await productIdBySku(page, "HT-SCR-006");
  await open(page, `/products/${screwdriverId}`);
  await waitForText(page, "Movement history");
  await clickText(page, "Stock out");
  await fill(page, '[role="dialog"] input[name="quantity"]', "50");
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
  await waitForText(page, "Manila Hardware");
  await shot(page, "12-suppliers");

  await open(page, "/users");
  await waitForText(page, "staff@stockwise.com");
  await shot(page, "13-users");

  // Staff view: no Users link and no admin actions.
  await resetSession(page, BASE_URL);
  await login(page, BASE_URL, "staff@stockwise.com", "Staff123!");
  await open(page, "/products");
  await waitForText(page, "products found");
  await shot(page, "14-products-staff-view");

  // ------------------------------------------------------------ Mobile (390)
  await page.setViewport(MOBILE);
  await open(page, "/");
  await page.waitForSelector(".recharts-surface");
  await shot(page, "15-dashboard-mobile");
  await open(page, "/products");
  await waitForText(page, "products found");
  await shot(page, "16-products-mobile");
  await page.click('button[aria-label="Open navigation"]');
  await new Promise((resolve) => setTimeout(resolve, 400));
  await shot(page, "17-navigation-drawer-mobile");

  await browser.close();
};

run().catch((error) => {
  console.error(`Screenshot capture failed: ${error.message}`);
  process.exitCode = 1;
});
