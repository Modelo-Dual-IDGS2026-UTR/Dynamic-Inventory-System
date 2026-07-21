import { useState } from 'react'
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google'

function App() {

  // Función para recibir la respuesta de Google tras iniciar sesión
  const handleSuccess = (credentialResponse) => {
    console.log('Token de Google:', credentialResponse.credential)
    // Aquí mandas credentialResponse.credential a tu Backend (Controller) para verificarlo
  }

  const handleError = () => {
    console.log('Error al iniciar sesión con Google')
  }

  return (
    // Envuelves tu app o componente con el Provider de Google
    <GoogleOAuthProvider clientId={import.meta.env.GOOGLE_CLIENT_ID}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '50px' }}>
        <h2>Iniciar Sesión</h2>
        
        {/* Este componente renderiza el botón oficial automáticamente */}
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={handleError}
          useOneTap // Opcional: Muestra una pequeña ventana emergente arriba a la derecha
        />
      </div>
    </GoogleOAuthProvider>
  )

}

export default App
