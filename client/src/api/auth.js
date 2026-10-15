import api from "./client";

/** @param {{ email: string, password: string }} credentials */
export const login = (credentials) => api.post("/auth/login", credentials).then((res) => res.data);

/** @param {{ name: string, email: string, password: string }} data */
export const register = (data) => api.post("/auth/register", data).then((res) => res.data);

export const getMe = () => api.get("/auth/me").then((res) => res.data);

/** @param {{ name?: string, email?: string }} data */
export const updateProfile = (data) => api.patch("/auth/me", data).then((res) => res.data);

/** @param {{ currentPassword: string, newPassword: string }} data Returns a new token. */
export const changePassword = (data) => api.patch("/auth/me/password", data).then((res) => res.data);

/** @param {{ email: string }} data Always succeeds with a generic message (no account probing). */
export const forgotPassword = (data) => api.post("/auth/forgot-password", data).then((res) => res.data);

/** @param {{ email: string, code: string, password: string }} data */
export const resetPassword = (data) => api.post("/auth/reset-password", data).then((res) => res.data);
