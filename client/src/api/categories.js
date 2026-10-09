import api from "./client";

export const getCategories = () => api.get("/categories").then((res) => res.data);

/** @param {{ name: string, description?: string }} data */
export const createCategory = (data) => api.post("/categories", data).then((res) => res.data);

/** @param {string} id @param {{ name: string, description?: string }} data */
export const updateCategory = (id, data) => api.put(`/categories/${id}`, data).then((res) => res.data);

/** @param {string} id */
export const deleteCategory = (id) => api.delete(`/categories/${id}`).then((res) => res.data);
