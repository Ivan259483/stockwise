/** Plain-text and HTML bodies for the emails StockWise sends. */
import { RESET_CODE_TTL_MINUTES, STORE_NAME } from "../utils/constants.js";

/** Escapes text placed inside the HTML templates. */
const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );

/** Wraps body HTML in a simple, email-client-safe layout. */
const layout = (title, bodyHtml) => `<!doctype html>
<html><body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#1e293b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px">
<table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #e2e8f0">
<tr><td style="padding:20px 24px;border-bottom:1px solid #e2e8f0">
<strong style="font-size:16px">${escapeHtml(STORE_NAME)}</strong><br><span style="font-size:12px;color:#64748b">StockWise inventory system</span>
</td></tr>
<tr><td style="padding:24px"><h1 style="font-size:18px;margin:0 0 12px">${escapeHtml(title)}</h1>${bodyHtml}</td></tr>
<tr><td style="padding:16px 24px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b">This is an automated message from StockWise. Please do not reply.</td></tr>
</table></td></tr></table></body></html>`;

/**
 * Password recovery code.
 * @param {{ name: string, code: string }} params
 */
export const passwordResetEmail = ({ name, code }) => ({
  subject: `${code} is your ${STORE_NAME} password reset code`,
  text: [
    `Hi ${name},`,
    "",
    `Your StockWise password reset code is: ${code}`,
    "",
    `It expires in ${RESET_CODE_TTL_MINUTES} minutes and can be used once.`,
    "If you did not ask to reset your password, you can ignore this email; your password has not changed.",
  ].join("\n"),
  html: layout(
    "Reset your password",
    `<p>Hi ${escapeHtml(name)},</p>
<p>Use this code to reset your StockWise password:</p>
<p style="font-size:30px;letter-spacing:8px;font-weight:bold;background:#eef2ff;color:#3730a3;padding:12px 16px;border-radius:8px;text-align:center">${escapeHtml(code)}</p>
<p>It expires in ${RESET_CODE_TTL_MINUTES} minutes and can be used once.</p>
<p style="color:#64748b;font-size:13px">If you did not ask to reset your password, you can ignore this email; your password has not changed.</p>`
  ),
});

/**
 * Low or out-of-stock alert for the admins.
 * @param {{ product: { name: string, sku: string, quantity: number, unit: string, reorderLevel: number }, appUrl?: string }} params
 */
export const lowStockEmail = ({ product, appUrl }) => {
  const status = product.quantity <= 0 ? "out of stock" : "low on stock";
  const link = appUrl ? `${appUrl.replace(/\/$/, "")}/products/${product._id}` : "";
  return {
    subject: `Stock alert: ${product.name} is ${status}`,
    text: [
      `${product.name} (${product.sku}) is ${status}.`,
      "",
      `On hand: ${product.quantity} ${product.unit}`,
      `Reorder level: ${product.reorderLevel} ${product.unit}`,
      "",
      "Consider creating a purchase order for this item.",
      link ? `Open in StockWise: ${link}` : null,
      "",
      "You will not get another alert for this product until it is restocked above its reorder level.",
    ]
      .filter((line) => line !== null)
      .join("\n"),
    html: layout(
      `${product.name} is ${status}`,
      `<table role="presentation" cellpadding="6" style="font-size:14px">
<tr><td style="color:#64748b">SKU</td><td><strong>${escapeHtml(product.sku)}</strong></td></tr>
<tr><td style="color:#64748b">On hand</td><td><strong style="color:${product.quantity <= 0 ? "#dc2626" : "#b45309"}">${product.quantity} ${escapeHtml(product.unit)}</strong></td></tr>
<tr><td style="color:#64748b">Reorder level</td><td>${product.reorderLevel} ${escapeHtml(product.unit)}</td></tr>
</table>
<p>Consider creating a purchase order for this item.</p>
${link ? `<p><a href="${escapeHtml(link)}" style="color:#4f46e5">Open in StockWise</a></p>` : ""}
<p style="color:#64748b;font-size:13px">You will not get another alert for this product until it is restocked above its reorder level.</p>`
    ),
  };
};
