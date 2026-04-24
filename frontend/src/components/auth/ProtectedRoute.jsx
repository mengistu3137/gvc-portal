import { Navigate, useLocation } from 'react-router-dom';
import { isAuthenticated, hasRole } from '../../lib/auth';

/**
 * Role Based Protected Route
 * @param {ReactNode} children - The component to render if access is granted
 * @param {string|string[]} allowedRoles - A single role string (e.g., 'ADMIN') or an array of roles (e.g., ['ADMIN', 'REGISTRAR'])
 */
export function ProtectedRoute({ children, allowedRoles }) {
  const location = useLocation();

  // 1. Check if user is logged in
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // 2. Check if user has the required role
  // If allowedRoles is not provided, we assume any authenticated user can access (optional logic, 
  // but usually specific routes need roles. Here we enforce if provided).
  if (allowedRoles && !hasRole(allowedRoles)) {
    // Redirect to home or a "Unauthorized" page if they don't have the role
    return <Navigate to="/" replace />;
  }

  return children;
}