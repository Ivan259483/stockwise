import axios from "axios";
import toast from "react-hot-toast";
import { getErrorMessage } from "../utils/errors";

/** localStorage key for the JWT. */
export const TOKEN_KEY = "stockwise_token";

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:5050").replace(/\/$/, "");

/** Shared axios instance used by every API module. */
const api = axios.create({ baseURL: `${API_BASE}/api`, timeout: 20000 });

/** Set by AuthContext so this module can end the session without importing React. */
let handleUnauthorized = () => {};

/** @param {() => void} handler Called when an authenticated request gets a 401. */
export const setUnauthorizedHandler = (handler) => {
  handleUnauthorized = handler;
};

// Attach the token to every request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/**
 * Global error handling: every failed request shows one toast (deduplicated by
 * message), and a 401 on an authenticated request clears the session, which
 * makes ProtectedRoute redirect to /login. A failed login is a 401 without a
 * token, so it only shows the toast.
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = getErrorMessage(error);
    toast.error(message, { id: message });

    if (error.response?.status === 401 && error.config?.headers?.Authorization) {
      handleUnauthorized();
    }
    return Promise.reject(error);
  }
);

export default api;
