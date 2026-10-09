import { createContext, useContext, useEffect, useState } from 'react';

export interface AuthUser {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  userStatus: boolean;
  area: string | null;
  fk_role: number;
}

interface AuthContextType {
  isAuthenticated: boolean | null;
  currentUser: AuthUser | null;
  setIsAuthenticated: (val: boolean) => void;
  refreshAuth: () => Promise<boolean>;
  logout: () => Promise<void>;
  setDemoRole: (userId: number, role: number) => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: null,
  currentUser: null,
  setIsAuthenticated: () => {},
  refreshAuth: async () => false,
  logout: async () => {},
  setDemoRole: () => {},
});

//Auth provider is a wrapper that will contain the business logic, in this case inside of <App/> 
export const AuthProvider = ({ children }: { children: React.ReactNode}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  const refreshAuth = async (): Promise<boolean> => {
    try {
      const response = await fetch('http://localhost:3000/api/user/me', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!response.ok) {
        setCurrentUser(null);
        setIsAuthenticated(false);
        return false;
      }

      const user: AuthUser = await response.json();
      const savedRole = localStorage.getItem(`demo-role-${user.userId}`);
      if (savedRole) user.fk_role = Number(savedRole);
      setCurrentUser(user);
      setIsAuthenticated(true);
      return true;
    } catch {
      setCurrentUser(null);
      setIsAuthenticated(false);
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await fetch('http://localhost:3000/api/user/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('No se pudo cerrar la sesión en el servidor.', error);
    } finally {
      setCurrentUser(null);
      setIsAuthenticated(false);
    }
  };

  const setDemoRole = (userId: number, role: number): void => {
    localStorage.setItem(`demo-role-${userId}`, String(role));
    setCurrentUser((user) => user && user.userId === userId ? { ...user, fk_role: role } : user);
  };

  useEffect(() => {
    void refreshAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, currentUser, setIsAuthenticated, refreshAuth, logout, setDemoRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
