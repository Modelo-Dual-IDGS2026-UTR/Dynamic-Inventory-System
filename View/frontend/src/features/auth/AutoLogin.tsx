import { useEffect } from 'react';

interface GoogleUser {
  sub: string;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  email: string;
  email_verified: boolean;
}

export default function AutoLogin(): null {
  useEffect(() => {
    const hash: string = window.location.hash;
    
    if (hash.includes('access_token=')) {
        const params: URLSearchParams = new URLSearchParams(hash.replace('#', '?'));
        const accessToken: string | null = params.get('access_token');
      
        
        console.log('Token succesfully granted!:', accessToken);
        console.log(accessToken);

        const fetchGoogleUserInfo = async () => {
            if (!accessToken) return;
            
            try {
            const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            });

            if (response.ok) {
                const userInfo: GoogleUser = await response.json();

                console.log('User information obtained successfully:', userInfo);

                await fetch('http://localhost:3000/api/user/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                },
            });
            } else {
                console.error('Error obtaining Google user data');
            }

        } catch (error) {
            console.error('Network error:', error);
        }
        };
            
        fetchGoogleUserInfo();

        return;
    }

    const clientId: string = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
    const redirectUri: string = window.location.origin;
    const scope: string = 'openid profile email';
    
    const googleAuthUrl: string = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(scope)}`;
    
    window.location.href = googleAuthUrl;
  }, []);

  return null;
}
