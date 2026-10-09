import api from "./client";

/** @param {{ email: string, password: string }} credentials */
export const login = (credentials) => api.post("/auth/login", credentials).then((res) => res.data);

/** @param {{ name: string, email: string, password: string }} data */
export const register = (data) => api.post("/auth/register", data).then((res) => res.data);

export const getMe = () => api.get("/auth/me").then((res) => res.data);
