import { createContext, useContext, useEffect, useState} from 'react';

interface AuthContextType {
  isAuthenticated: boolean | null;
  setIsAuthenticated: (val: boolean) => void;
}

const AuthContext = createContext<AuthContextType>({ isAuthenticated: null, setIsAuthenticated: () => {} });

//Auth provider is a wrapper that will contain the business logic, in this case inside of <App/> 
export const AuthProvider = ({ children }: { children: React.ReactNode}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  
  useEffect(() => {
    const request = (url: string, options: RequestInit = {}) => fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
    ...options,
    });

    const checkAuthentication = async () => {
      try {
        let response = await request('http://localhost:3000/api/user/me');

        if (response.status === 401) {
          const refreshResponse = await request('http://localhost:3000/api/user/refresh', {
            method: 'POST',
          });

          if (refreshResponse.ok) {
            response = await request('http://localhost:3000/api/user/me');
          }
        }

        setIsAuthenticated(response.ok);
      } catch {
        setIsAuthenticated(false);
      }
    };

    void checkAuthentication();
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, setIsAuthenticated}}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
