/**
 * Archive API. `type` is the resource path: "products", "suppliers", "users"
 * or "purchase-orders". Records are archived (soft-deleted), never deleted.
 */
import api from "./client";

/** @param {string} type @param {string} id @param {string} reason */
export const archiveRecord = (type, id, reason) =>
  api.patch(`/${type}/${id}/archive`, { reason }).then((res) => res.data);

/** @param {string} type @param {string} id */
export const restoreRecord = (type, id) => api.patch(`/${type}/${id}/restore`).then((res) => res.data);

/**
 * Archived records of one type (admin only).
 * @param {string} type @param {{ search?: string, page?: number, limit?: number }} params
 * @returns {Promise<{ data: object[], page: number, totalPages: number, total: number, counts: Record<string, number> }>}
 */
export const getArchived = (type, params) => api.get(`/archive/${type}`, { params }).then((res) => res.data);
