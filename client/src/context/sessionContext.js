import { createContext } from "react";

/**
 * Holds the auth state provided by <AuthProvider> (see AuthContext.jsx).
 * Kept in its own module so the provider file only exports a component,
 * which React Fast Refresh requires. Read it with the `useAuth` hook.
 */
export const SessionContext = createContext(null);
