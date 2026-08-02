//Created to verify if the token is valid or not, to avoid unnecessary API calls when the token is expired

export const isTokenValid = (): boolean => {
  const token = localStorage.getItem('appToken');
  if (!token) return false;

  try {
    const payloadBase64 = token.split('.')[1];
    const decodedPayload = JSON.parse(atob(payloadBase64));

    // exp is in seconds, Date.now in miliseconds
    const currentTime = Date.now() / 1000;

    return decodedPayload.exp > currentTime;
  } catch (error) {
    // If token is corrupt or has a wrong format
    return false;
  }
};