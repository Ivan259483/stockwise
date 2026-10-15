import api from "./client";

export const getUsers = () => api.get("/users").then((res) => res.data);

/** @param {{ name: string, email: string, password: string, role: "admin"|"staff" }} data */
export const createUser = (data) => api.post("/users", data).then((res) => res.data);

/** @param {string} id @param {{ name?: string, email?: string, role?: "admin"|"staff", isActive?: boolean }} data */
export const updateUser = (id, data) => api.patch(`/users/${id}`, data).then((res) => res.data);
