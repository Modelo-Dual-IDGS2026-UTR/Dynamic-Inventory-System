import { useEffect } from 'react'
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google'

function AutoLogin() {
  useEffect(() => {
    // 1. Revisamos si la URL ya contiene el token de respuesta de Google
    const hash = window.location.hash
    
    if (hash.includes('access_token=')) {
      // Extraemos el token del hash
      const params = new URLSearchParams(hash.replace('#', '?'))
      const accessToken = params.get('access_token')
      
      console.log('¡Token obtenido con éxito!:', accessToken)
      
      const youtube = 'https://www.youtube.com/shorts/F63MPQls7G0'
      window.location.href = youtube
      return
    }

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    const redirectUri = window.location.origin
    const scope = 'openid profile email'
    
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(scope)}`
    
    window.location.href = googleAuthUrl
  }, [])

  return <h2></h2>
}


export default function App() {

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <AutoLogin />
    </GoogleOAuthProvider>
  )
}

