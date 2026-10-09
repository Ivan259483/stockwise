import { useEffect } from "react";
import toast from "react-hot-toast";
import { Navigate, Outlet } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

/** Sends staff back to the dashboard, explaining why with a toast. */
function RedirectNonAdmin() {
  useEffect(() => {
    toast.error("That page is for administrators only.", { id: "admin-only" });
  }, []);
  return <Navigate to="/" replace />;
}

/**
 * Renders child routes only for admins (must be nested inside ProtectedRoute).
 * The API enforces the same rule; this guard just avoids showing a broken page.
 */
export default function AdminRoute() {
  const { isAdmin } = useAuth();
  return isAdmin ? <Outlet /> : <RedirectNonAdmin />;
}
