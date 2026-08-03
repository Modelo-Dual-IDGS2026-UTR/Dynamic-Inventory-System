import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AutoLogin(): null {
  const navigate = useNavigate();
  const hasAttemptedLogin = useRef(false);

  useEffect(() => {
    if (hasAttemptedLogin.current) return;

    const hash: string = window.location.hash;
    
    if (hash.includes('error=')) {
        console.error('El usuario canceló o hubo un error con Google');
        navigate('/login', { replace: true });
        return;
    }

    if (hash.includes('id_token=')) {
        hasAttemptedLogin.current = true;

        window.history.replaceState(null, '', window.location.pathname);

        const params: URLSearchParams = new URLSearchParams(hash.replace('#', '?'));
        const idToken: string | null = params.get('id_token');
      
        if (!idToken) return;

        console.log('Token succesfully granted!:', idToken);

        const authenticateWithBackend = async () => {
            try {
                const response = await fetch('http://localhost:3000/api/user/login', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${idToken}`,
                    },
                    credentials: 'include'
                });

                
            if (response.ok) {
                const data = await response.json();
                console.log(data);

                if (!data.isUserComplete) {
                    navigate('/select-area', { replace: true });
                } else {
                    navigate('/dashboard', { replace: true });
                }
            } else {
                console.error('Error obtaining Google user data');
                navigate('/login', { replace: true});
            }

        } catch (error) {// Generar un texto aleatorio simple
            console.error('Network error:', error);
            navigate('/login', { replace: true});
        }
        };
            
        authenticateWithBackend();

        return;
    }

    const clientId: string = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
    const redirectUri: string = window.location.origin;
    const scope: string = 'openid profile email';
    
    const nonce = Math.random().toString(36).substring(2); 
    const googleAuthUrl: string = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=id_token&scope=${encodeURIComponent(scope)}&nonce=${nonce}`;
    
    window.location.href = googleAuthUrl;
  }, [navigate]);

  return null;
}
