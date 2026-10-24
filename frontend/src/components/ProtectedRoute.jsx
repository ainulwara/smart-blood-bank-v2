import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getDashboardPath, useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ allowedRoles }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles?.length) {
    const role = String(user?.role || "").toLowerCase();
    if (!allowedRoles.includes(role)) {
      return <Navigate to={getDashboardPath(role)} replace />;
    }
  }

  return <Outlet />;
}