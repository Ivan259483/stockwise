import { Navigate, Outlet } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

/** Login/Register are only for signed-out visitors; signed-in users go to the dashboard. */
export default function PublicOnlyRoute() {
  const { isAuthenticated, initializing } = useAuth();
  if (!initializing && isAuthenticated) return <Navigate to="/" replace />;
  return <Outlet />;
}
