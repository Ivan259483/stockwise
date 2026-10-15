import api from "./client";

/**
 * @param {{ status?: string, search?: string, supplier?: string, page?: number, limit?: number }} params
 * @returns {Promise<{ data: object[], page: number, totalPages: number, total: number, counts: Record<string, number> }>}
 */
export const getPurchaseOrders = (params) => api.get("/purchase-orders", { params }).then((res) => res.data);

/** @param {string} id */
export const getPurchaseOrder = (id) => api.get(`/purchase-orders/${id}`).then((res) => res.data);

/** @param {{ supplier: string, items: Array<{ product: string, quantity: number, unitCost: number }>, notes?: string }} data */
export const createPurchaseOrder = (data) => api.post("/purchase-orders", data).then((res) => res.data);

/** @param {string} id @param {string} [note] */
export const approvePurchaseOrder = (id, note) =>
  api.patch(`/purchase-orders/${id}/approve`, { note }).then((res) => res.data);

/** @param {string} id @param {string} reason */
export const rejectPurchaseOrder = (id, reason) =>
  api.patch(`/purchase-orders/${id}/reject`, { reason }).then((res) => res.data);

/** @param {string} id @param {string} [reason] */
export const cancelPurchaseOrder = (id, reason) =>
  api.patch(`/purchase-orders/${id}/cancel`, { reason }).then((res) => res.data);

/** @param {string} id @param {string} [note] */
export const receivePurchaseOrder = (id, note) =>
  api.patch(`/purchase-orders/${id}/receive`, { note }).then((res) => res.data);
