import api from "./client";

export const getSuppliers = () => api.get("/suppliers").then((res) => res.data);

/** @param {object} data Supplier fields (name, contactPerson, phone, email, address). */
export const createSupplier = (data) => api.post("/suppliers", data).then((res) => res.data);

/** @param {string} id @param {object} data */
export const updateSupplier = (id, data) => api.put(`/suppliers/${id}`, data).then((res) => res.data);

/** @param {string} id */
export const deleteSupplier = (id) => api.delete(`/suppliers/${id}`).then((res) => res.data);
