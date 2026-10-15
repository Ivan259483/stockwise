/**
 * Outgoing email (Gmail SMTP through nodemailer).
 *
 * Delivery rules, in order:
 * 1. NODE_ENV=test: nothing is sent; each message is appended to tmp/outbox.jsonl
 *    so the automated tests can read the password-reset code.
 * 2. Addresses on test/reserved domains and the demo domain are never emailed
 *    (they do not exist, so Gmail would only collect bounces).
 * 3. If SMTP_USER/SMTP_PASS are missing, nothing is sent. In development the
 *    message is printed in the backend console instead, so the flow can still
 *    be demonstrated; in production only a warning without the content is logged.
 */
import { appendFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import nodemailer from "nodemailer";
import { DEMO_EMAIL_DOMAIN, STORE_NAME } from "../utils/constants.js";

const OUTBOX_DIR = fileURLToPath(new URL("../tmp/", import.meta.url));
export const OUTBOX_FILE = `${OUTBOX_DIR}outbox.jsonl`;

/** Domains that must never receive real email. */
const SUPPRESSED_DOMAINS = [DEMO_EMAIL_DOMAIN, "example.com", "example.net", "example.org"];
/** Reserved top-level domains (RFC 2606) used for tests and documentation. */
const SUPPRESSED_TLDS = [".test", ".example", ".invalid", ".localhost"];

const isProduction = () => process.env.NODE_ENV === "production";

/** True when the Gmail (SMTP) credentials are present in the environment. */
export const isMailConfigured = () => Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);

/**
 * False for addresses that should never receive mail (demo and test domains).
 * @param {string} email
 */
export const isDeliverable = (email) => {
  const domain = String(email).split("@")[1]?.toLowerCase() ?? "";
  if (!domain) return false;
  return !SUPPRESSED_DOMAINS.includes(domain) && !SUPPRESSED_TLDS.some((tld) => domain.endsWith(tld));
};

let transporter;
/** Creates the SMTP transport once (warm serverless instances reuse it). */
const getTransporter = () => {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT) || 465;
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
};

const fromAddress = () => `"${process.env.MAIL_FROM_NAME || `${STORE_NAME} (StockWise)`}" <${process.env.SMTP_USER}>`;

/**
 * Sends one email. Never throws for "not configured" or suppressed recipients;
 * SMTP errors are thrown so the caller can decide how to react.
 *
 * @param {{ to: string|string[], subject: string, text: string, html?: string }} message
 * @returns {Promise<{ delivered: boolean, reason?: string, recipients: string[] }>}
 */
export const sendMail = async ({ to, subject, text, html }) => {
  const recipients = [to].flat().filter(Boolean);

  if (process.env.NODE_ENV === "test") {
    await mkdir(OUTBOX_DIR, { recursive: true });
    const entry = { to: recipients, subject, text, sentAt: new Date().toISOString() };
    await appendFile(OUTBOX_FILE, `${JSON.stringify(entry)}\n`);
    return { delivered: false, reason: "test outbox", recipients };
  }

  const deliverable = recipients.filter(isDeliverable);
  const reason = !isMailConfigured()
    ? "email is not configured (SMTP_USER/SMTP_PASS)"
    : deliverable.length === 0
      ? "demo/test address"
      : null;

  if (reason) {
    if (isProduction()) {
      console.warn(`[mail] Not sent (${reason}): "${subject}"`);
    } else {
      console.log(
        `\n[mail] Not sent (${reason}). Development copy:\n  To: ${recipients.join(", ")}\n  Subject: ${subject}\n${text
          .split("\n")
          .map((line) => `  ${line}`)
          .join("\n")}\n`
      );
    }
    return { delivered: false, reason, recipients };
  }

  await getTransporter().sendMail({ from: fromAddress(), to: deliverable, subject, text, html });
  return { delivered: true, recipients: deliverable };
};
