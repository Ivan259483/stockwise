import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import * as authApi from "../api/auth";
import { setUnauthorizedHandler, TOKEN_KEY } from "../api/client";

/** @type {import("react").Context<ReturnType<typeof useAuthState> | null>} */
export const AuthContext = createContext(null);

/**
 * Owns the session: the JWT lives in localStorage (so a refresh keeps you
 * logged in) and the user object lives in React state. On start-up a saved
 * token is verified with /auth/me before any protected page renders.
 */
function useAuthState() {
  const [user, setUser] = useState(null);
  // Only "initializing" if there is a token to verify; otherwise render right away.
  const [initializing, setInitializing] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)));

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  // Let the axios interceptor end the session on any 401.
  useEffect(() => setUnauthorizedHandler(logout), [logout]);

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    authApi
      .getMe()
      .then((body) => setUser(body.data))
      .catch(logout)
      .finally(() => setInitializing(false));
  }, [logout]);

  /** Saves the token and user returned by login/register. */
  const startSession = useCallback(({ token, user: sessionUser }) => {
    localStorage.setItem(TOKEN_KEY, token);
    setUser(sessionUser);
    return sessionUser;
  }, []);

  const login = useCallback(
    async (credentials) => startSession((await authApi.login(credentials)).data),
    [startSession]
  );

  const register = useCallback(async (data) => startSession((await authApi.register(data)).data), [startSession]);

  return useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === "admin",
      initializing,
      login,
      register,
      logout,
    }),
    [user, initializing, login, register, logout]
  );
}

/** Provides the auth state to the whole app. Read it with the `useAuth` hook. */
export function AuthProvider({ children }) {
  const auth = useAuthState();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}
