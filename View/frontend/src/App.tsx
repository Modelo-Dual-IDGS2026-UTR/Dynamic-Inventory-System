import { JSX} from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import AutoLogin from './features/auth/AutoLogin';

export default function App(): JSX.Element {
  const clientId: string = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <AutoLogin />
    </GoogleOAuthProvider>
  );
}