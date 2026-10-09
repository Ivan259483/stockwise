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

/** @param {{ name: string, email: string, password: string, confirmPassword: string }} values */
export const validateRegister = ({ name, email, password, confirmPassword }) => {
  const errors = validateLogin({ email, password });
  if (isBlank(name)) errors.name = "Name is required";
  else if (name.trim().length > 60) errors.name = "Name must be at most 60 characters";
  if (password && password.length < 8) errors.password = "Password must be at least 8 characters";
  else if (password && !(/[A-Za-z]/.test(password) && /\d/.test(password))) {
    errors.password = "Password must contain at least one letter and one number";
  }
  if (confirmPassword !== password) errors.confirmPassword = "Passwords do not match";
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
 * Checks a selected image file before it is read into a data URL.
 * @param {File} file
 * @returns {string|null} Error message, or null when the file is acceptable.
 */
export const validateImageFile = (file) => {
  if (!IMAGE_TYPES.includes(file.type)) return "Please choose a PNG, JPG, GIF or WebP image";
  if (file.size > MAX_IMAGE_BYTES) return "Image must be 1 MB or smaller";
  return null;
};
