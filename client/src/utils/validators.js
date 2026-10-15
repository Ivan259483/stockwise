/**
 * Client-side form validation. These mirror the API's express-validator rules
 * so users get instant feedback; the server still validates everything.
 * Each function returns `{ [field]: message }` (empty object = valid).
 */
import { IMAGE_TYPES, MAX_IMAGE_BYTES } from "./constants";

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
const SKU_PATTERN = /^[A-Z0-9-]{2,30}$/;
const PHONE_PATTERN = /^[0-9+()\-\s]{7,20}$/;

const isBlank = (value) => String(value ?? "").trim() === "";
const isNonNegativeNumber = (value) => !isBlank(value) && Number.isFinite(Number(value)) && Number(value) >= 0;
const isNonNegativeInteger = (value) => isNonNegativeNumber(value) && Number.isInteger(Number(value));

/** @param {{ email: string, password: string }} values */
export const validateLogin = ({ email, password }) => {
  const errors = {};
  if (isBlank(email)) errors.email = "Email is required";
  else if (!EMAIL_PATTERN.test(email.trim())) errors.email = "Please enter a valid email address";
  if (!password) errors.password = "Password is required";
  return errors;
};

/** Same strength rule as the API: 8+ characters with a letter and a number. Returns a message or null. */
const passwordProblem = (password) => {
  if (!password) return "Password is required";
  if (password.length < 8) return "Password must be at least 8 characters";
  if (!(/[A-Za-z]/.test(password) && /\d/.test(password))) {
    return "Password must contain at least one letter and one number";
  }
  return null;
};

/** @param {{ name: string, email: string }} values Name and email (profile and user forms). */
export const validateNameEmail = ({ name, email }) => {
  const errors = {};
  if (isBlank(name)) errors.name = "Name is required";
  else if (name.trim().length > 60) errors.name = "Name must be at most 60 characters";
  if (isBlank(email)) errors.email = "Email is required";
  else if (!EMAIL_PATTERN.test(email.trim())) errors.email = "Please enter a valid email address";
  return errors;
};

/** @param {{ name: string, email: string, password: string, confirmPassword: string }} values */
export const validateRegister = ({ name, email, password, confirmPassword }) => {
  const errors = validateNameEmail({ name, email });
  const problem = passwordProblem(password);
  if (problem) errors.password = problem;
  if (confirmPassword !== password) errors.confirmPassword = "Passwords do not match";
  return errors;
};

/** @param {{ currentPassword: string, newPassword: string, confirmPassword: string }} values */
export const validatePasswordChange = ({ currentPassword, newPassword, confirmPassword }) => {
  const errors = {};
  if (!currentPassword) errors.currentPassword = "Current password is required";
  const problem = passwordProblem(newPassword);
  if (problem) errors.newPassword = problem;
  if (confirmPassword !== newPassword) errors.confirmPassword = "Passwords do not match";
  return errors;
};

/** @param {{ email: string }} values */
export const validateEmailOnly = ({ email }) => {
  if (isBlank(email)) return { email: "Email is required" };
  if (!EMAIL_PATTERN.test(email.trim())) return { email: "Please enter a valid email address" };
  return {};
};

/** @param {{ email: string, code: string, password: string, confirmPassword: string }} values */
export const validatePasswordReset = ({ email, code, password, confirmPassword }) => {
  const errors = validateEmailOnly({ email });
  if (!/^\d{6}$/.test(String(code ?? "").trim())) errors.code = "Enter the 6-digit code from the email";
  const problem = passwordProblem(password);
  if (problem) errors.password = problem;
  if (confirmPassword !== password) errors.confirmPassword = "Passwords do not match";
  return errors;
};

/**
 * Admin "Add user" / "Edit user" form. The temporary password is required
 * only when creating an account.
 * @param {{ name: string, email: string, role: string, password?: string }} values
 * @param {{ isEdit: boolean }} options
 */
export const validateUserForm = (values, { isEdit }) => {
  const errors = validateNameEmail(values);
  if (!["admin", "staff"].includes(values.role)) errors.role = "Please choose a role";
  if (!isEdit) {
    const problem = passwordProblem(values.password);
    if (problem) errors.password = problem;
  }
  return errors;
};

/** @param {{ name: string, description?: string }} values */
export const validateCategory = ({ name, description }) => {
  const errors = {};
  if (isBlank(name)) errors.name = "Category name is required";
  else if (name.trim().length > 50) errors.name = "Category name must be at most 50 characters";
  if (description && description.length > 300) errors.description = "Description must be at most 300 characters";
  return errors;
};

/** @param {{ name: string, phone?: string, email?: string }} values */
export const validateSupplier = ({ name, phone, email }) => {
  const errors = {};
  if (isBlank(name)) errors.name = "Supplier name is required";
  if (!isBlank(phone) && !PHONE_PATTERN.test(phone.trim())) errors.phone = "Please enter a valid phone number";
  if (!isBlank(email) && !EMAIL_PATTERN.test(email.trim())) errors.email = "Please enter a valid email address";
  return errors;
};

/**
 * @param {Record<string, string>} values Product form values (inputs are strings).
 * @param {{ isEdit: boolean }} options Quantity is only validated on create.
 */
export const validateProduct = (values, { isEdit }) => {
  const errors = {};
  if (isBlank(values.name)) errors.name = "Product name is required";
  if (isBlank(values.sku)) errors.sku = "SKU is required";
  else if (!SKU_PATTERN.test(values.sku.trim().toUpperCase())) {
    errors.sku = "Use 2–30 letters, numbers or dashes (e.g. HT-HAM-016)";
  }
  if (isBlank(values.category)) errors.category = "Please choose a category";
  if (!isNonNegativeNumber(values.costPrice)) errors.costPrice = "Enter a cost price of 0 or more";
  if (!isNonNegativeNumber(values.sellingPrice)) errors.sellingPrice = "Enter a selling price of 0 or more";
  if (!isNonNegativeInteger(values.reorderLevel)) errors.reorderLevel = "Enter a whole number of 0 or more";
  if (!isEdit && !isNonNegativeInteger(values.quantity)) errors.quantity = "Enter a whole number of 0 or more";
  return errors;
};

/**
 * Stock movement form. Available stock is deliberately NOT checked here: the
 * API's atomic guard is the single source of truth (another user may have
 * changed the stock), and its 409 message is shown inline on the quantity field.
 *
 * @param {{ productId: string, quantity: string, reason: string }} values
 */
export const validateMovement = ({ productId, quantity, reason }) => {
  const errors = {};
  if (isBlank(productId)) errors.productId = "Please choose a product";
  if (!isNonNegativeInteger(quantity) || Number(quantity) < 1) errors.quantity = "Enter a whole number of at least 1";
  if (isBlank(reason)) errors.reason = "Please choose a reason";
  return errors;
};

/**
 * New purchase order: a supplier and at least one complete item row, with no
 * product listed twice. Errors use the API's field names (items[0].quantity).
 *
 * @param {{ supplier: string, items: Array<{ product: string, quantity: string, unitCost: string }> }} values
 */
export const validatePurchaseOrder = ({ supplier, items }) => {
  const errors = {};
  if (isBlank(supplier)) errors.supplier = "Please choose a supplier";
  if (items.length === 0) errors.items = "Add at least one item";
  const seen = new Set();
  items.forEach((item, index) => {
    if (isBlank(item.product)) errors[`items[${index}].product`] = "Please choose a product";
    else if (seen.has(item.product)) errors[`items[${index}].product`] = "This product is already on the order";
    seen.add(item.product);
    if (!isNonNegativeInteger(item.quantity) || Number(item.quantity) < 1) {
      errors[`items[${index}].quantity`] = "Whole number, at least 1";
    }
    if (!isNonNegativeNumber(item.unitCost)) errors[`items[${index}].unitCost`] = "Enter 0 or more";
  });
  return errors;
};

/**
 * Checks a selected image file before it is read into a data URL.
 * @param {File} file
 * @returns {string|null} Error message, or null when the file is acceptable.
 */
export const validateImageFile = (file) => {
  if (!IMAGE_TYPES.includes(file.type)) return "Please choose a PNG, JPG, GIF or WebP image";
  if (file.size > MAX_IMAGE_BYTES) return "Image must be 1 MB or smaller";
  return null;
};
