/**
 * Low-stock email alerts (an integration between stock movements and Gmail SMTP).
 *
 * When a stock OUT leaves a product at or below its reorder level, every active
 * admin is emailed once. The "already alerted" flag (lowStockAlertSentAt) is
 * claimed with an atomic update, so two simultaneous sales cannot send two
 * emails, and it is cleared when the product is restocked above its reorder
 * level, so the next drop alerts again. Email failures never fail the sale.
 */
import Product from "../models/Product.js";
import User from "../models/User.js";
import { ACTIVE_FILTER } from "../models/plugins/archivable.js";
import { lowStockEmail } from "./emailTemplates.js";
import { sendMail } from "./mailer.js";

/** The deployed web app's address for the link in the email (prefers an https CLIENT_URL entry). */
const appUrl = () => {
  if (process.env.APP_URL) return process.env.APP_URL;
  const origins = (process.env.CLIENT_URL ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  return origins.find((o) => o.startsWith("https://")) ?? origins[0] ?? "";
};

/** Active admins plus any extra addresses in STOCK_ALERT_CC (comma-separated). */
const recipients = async () => {
  const admins = await User.find({ role: "admin", isActive: true, ...ACTIVE_FILTER }).select("email");
  const extra = (process.env.STOCK_ALERT_CC ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  return [...new Set([...admins.map((a) => a.email), ...extra])];
};

/**
 * Called after a stock OUT. Emails the admins if the product just became low
 * or out of stock and has not been alerted since its last restock.
 *
 * @param {import("mongoose").Document} product The product after the update.
 * @returns {Promise<{ sent: boolean, delivered?: boolean, recipients?: number }>}
 */
export const alertIfLow = async (product) => {
  if (product.quantity > product.reorderLevel) return { sent: false };

  const claimed = await Product.findOneAndUpdate(
    { _id: product._id, lowStockAlertSentAt: null, $expr: { $lte: ["$quantity", "$reorderLevel"] } },
    { $set: { lowStockAlertSentAt: new Date() } },
    { returnDocument: "after" }
  );
  if (!claimed) return { sent: false };

  try {
    const to = await recipients();
    const result = await sendMail({ to, ...lowStockEmail({ product: claimed, appUrl: appUrl() }) });
    return { sent: true, delivered: result.delivered, recipients: to.length };
  } catch (error) {
    // Release the flag so the next sale tries again.
    await Product.updateOne({ _id: product._id }, { $set: { lowStockAlertSentAt: null } });
    console.error(`[mail] Low-stock alert for ${product.sku} failed:`, error.message);
    return { sent: false };
  }
};

/**
 * Called after a stock IN: once the product is back above its reorder level,
 * the next drop may alert again.
 *
 * @param {import("mongoose").Document} product The product after the update.
 */
export const resetAlertIfRestocked = async (product) => {
  if (product.quantity <= product.reorderLevel || !product.lowStockAlertSentAt) return;
  await Product.updateOne(
    { _id: product._id, $expr: { $gt: ["$quantity", "$reorderLevel"] } },
    { $set: { lowStockAlertSentAt: null } }
  );
  product.lowStockAlertSentAt = null;
};
