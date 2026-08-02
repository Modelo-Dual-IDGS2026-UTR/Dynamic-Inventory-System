import { Navigate, Outlet } from 'react-router-dom';
import { isTokenValid } from '../utils/auth';

export const ProtectedRoute = () => {
  const isValid = isTokenValid();

  if (!isValid) {
    // Remove old or expired token
    localStorage.removeItem('appToken');
    
    // Redirect to login page, replacing the history
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};