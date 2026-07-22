import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google'

function App() {

  const handleSuccess = (credentialResponse) => {
    console.log('Token de Google:', credentialResponse.credential)
  }

  const handleError = () => {
    console.log('Error al iniciar sesión con Google')
  }

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '50px' }}>
        <h2>Iniciar Sesión</h2>
        
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={handleError}
          prompt="select_account"
        />
      </div>
    </GoogleOAuthProvider>
  )
}

export default App