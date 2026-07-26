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

    if (hash.includes('access_token=')) {
        hasAttemptedLogin.current = true;

        const params: URLSearchParams = new URLSearchParams(hash.replace('#', '?'));
        const accessToken: string | null = params.get('access_token');
      
        if (!accessToken) return;

        console.log('Token succesfully granted!:', accessToken);

        const authenticateWithBackend = async () => {
            try {
                const response = await fetch('http://localhost:3000/api/user/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`,
                    },
                });

            if (response.ok) {
                const data = await response.json();

                if (data.token) {
                    localStorage.setItem('appToken', data.token);
                    console.log("Se guardo el token en el navegador")
                };

                if (!data.user.isProfileComplete) {
                    navigate('/select-area', { replace: true });
                } else {
                    navigate('/dashboard', { replace: true });
                }
            } else {
                console.error('Error obtaining Google user data');
                navigate('/login', { replace: true});
            }

        } catch (error) {
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
    
    const googleAuthUrl: string = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(scope)}`;
    
    window.location.href = googleAuthUrl;
  }, [navigate]);

  return null;
}
