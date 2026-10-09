import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

/**
 * Returns `{ user, isAuthenticated, isAdmin, initializing, login, register, logout }`.
 * Throws if used outside <AuthProvider> so wiring mistakes fail loudly.
 */
export default function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
