import { JSX} from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { BrowserRouter } from 'react-router-dom';
import { AppRouter } from './routes/AppRouter';
import { AuthProvider } from './utils/auth';

export default function App(): JSX.Element {
  const clientId: string = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <AuthProvider>
        <BrowserRouter>
            <AppRouter />
        </BrowserRouter>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}