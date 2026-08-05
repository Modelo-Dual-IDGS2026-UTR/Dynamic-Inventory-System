import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../utils/auth';

export const ProtectedRoute = () => {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated === null) {
    return <div>Cargando...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};