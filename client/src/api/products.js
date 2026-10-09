import api from "./client";

/**
 * @param {{ search?: string, category?: string, status?: string, sort?: string, page?: number, limit?: number }} params
 * @returns {Promise<{ data: object[], page: number, totalPages: number, total: number }>}
 */
export const getProducts = (params) => api.get("/products", { params }).then((res) => res.data);

/** @param {string} id @returns {Promise<{ data: { product: object, movements: object[] } }>} */
export const getProduct = (id) => api.get(`/products/${id}`).then((res) => res.data);

/** @param {object} data */
export const createProduct = (data) => api.post("/products", data).then((res) => res.data);

/** @param {string} id @param {object} data */
export const updateProduct = (id, data) => api.put(`/products/${id}`, data).then((res) => res.data);

/** @param {string} id */
export const deleteProduct = (id) => api.delete(`/products/${id}`).then((res) => res.data);
