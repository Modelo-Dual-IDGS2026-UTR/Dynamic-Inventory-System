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
    console.log("Ejecutando comprobación")
    fetch('http://localhost:3000/api/user/me', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
    })
    .then((res) => setIsAuthenticated(res.ok))
    .catch(() => setIsAuthenticated(false))
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, setIsAuthenticated}}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
