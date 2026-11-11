const configuredApiUrl = import.meta.env.VITE_API_URL as string | undefined;

const baseApiUrl = (configuredApiUrl || 'http://localhost:3000').replace(/\/+$/, '');

export const API_URL = baseApiUrl.endsWith('/api')
  ? baseApiUrl
  : `${baseApiUrl}/api`;
