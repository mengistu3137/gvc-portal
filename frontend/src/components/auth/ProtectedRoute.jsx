import { Navigate, useLocation } from 'react-router-dom';
import { isAuthenticated, hasPermission } from '../../lib/auth';

export function ProtectedRoute({ children, permission }) {
  const location = useLocation();

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (permission && !hasPermission(permission)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
