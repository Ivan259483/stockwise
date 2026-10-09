import api from "./client";

export const getUsers = () => api.get("/users").then((res) => res.data);

/** @param {string} id @param {{ role?: "admin"|"staff", isActive?: boolean }} data */
export const updateUser = (id, data) => api.patch(`/users/${id}`, data).then((res) => res.data);

/** @param {string} id */
export const deleteUser = (id) => api.delete(`/users/${id}`).then((res) => res.data);
