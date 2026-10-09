/**
 * Shared headless-Chrome helpers for the E2E test and the screenshot script.
 * Uses the locally installed Google Chrome through puppeteer-core (no bundled Chromium).
 */
import puppeteer from "puppeteer-core";

const CHROME_PATH = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

export const DESKTOP = { width: 1440, height: 900 };
export const MOBILE = { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };

/** Launches headless Chrome. */
export const launch = () =>
  puppeteer.launch({ executablePath: CHROME_PATH, headless: true, args: ["--no-first-run", "--hide-scrollbars"] });

/** Waits until the page's visible text contains `text`. */
export const waitForText = (page, text, timeout = 15000) =>
  page.waitForFunction((t) => document.body.innerText.includes(t), { timeout }, text);

/** Waits until `text` is no longer visible on the page. */
export const waitForNoText = (page, text, timeout = 15000) =>
  page.waitForFunction((t) => !document.body.innerText.includes(t), { timeout }, text);

/**
 * Clicks the first visible element matching `selector` whose text (or aria-label) contains `text`.
 * @param {import("puppeteer-core").Page} page
 */
export const clickText = async (page, text, selector = "button, a") => {
  await page.waitForFunction(
    (sel, t) =>
      [...document.querySelectorAll(sel)].some(
        (el) =>
          el.offsetParent !== null &&
          !el.disabled &&
          (el.innerText.includes(t) || el.getAttribute("aria-label")?.includes(t))
      ),
    { timeout: 15000 },
    selector,
    text
  );
  await page.evaluate(
    (sel, t) => {
      const el = [...document.querySelectorAll(sel)].find(
        (e) =>
          e.offsetParent !== null &&
          !e.disabled &&
          (e.innerText.includes(t) || e.getAttribute("aria-label")?.includes(t))
      );
      el.click();
    },
    selector,
    text
  );
};

/** Clears an input (by CSS selector) and types a new value. */
export const fill = async (page, selector, value) => {
  await page.waitForSelector(selector, { visible: true });
  await page.$eval(selector, (el) => {
    el.focus();
    el.select?.();
  });
  await page.keyboard.press("Backspace");
  if (value !== "") await page.type(selector, String(value));
};

/** Logs in through the UI and waits for the dashboard. */
export const login = async (page, baseUrl, email, password) => {
  await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle0" });
  await fill(page, 'input[name="email"]', email);
  await fill(page, 'input[name="password"]', password);
  await clickText(page, "Sign in", 'button[type="submit"]');
  await waitForText(page, "Total products", 30000);
};

/** Logs out by clearing the stored token (fast and independent of the UI). */
export const resetSession = async (page, baseUrl) => {
  await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => localStorage.clear());
};

/** True when the page scrolls horizontally (layout overflow on small screens). */
export const hasHorizontalOverflow = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
