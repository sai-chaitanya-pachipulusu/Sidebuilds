// Token validation utilities

export const isTokenValid = (token) => {
  if (!token || token === 'null' || token === 'undefined') {
    return false;
  }

  // Check JWT format (should have 3 parts separated by dots)
  const parts = token.split('.');
  if (parts.length !== 3) {
    return false;
  }

  try {
    // Decode payload to check expiration
    const payload = parts[1];
    const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
    const decodedPayload = JSON.parse(atob(paddedPayload));
    
    // Check if token has expired
    if (decodedPayload.exp) {
      const expDate = new Date(decodedPayload.exp * 1000);
      const now = new Date();
      if (now > expDate) {
        return false;
      }
    }

    // Check if user data exists in token
    if (!decodedPayload.user || !decodedPayload.user.id) {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error validating token:', error);
    return false;
  }
};

export const getTokenPayload = (token) => {
  if (!isTokenValid(token)) {
    return null;
  }

  try {
    const parts = token.split('.');
    const payload = parts[1];
    const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
    return JSON.parse(atob(paddedPayload));
  } catch (error) {
    console.error('Error decoding token payload:', error);
    return null;
  }
};

export const clearInvalidTokens = () => {
  const token = localStorage.getItem('token');
  if (!isTokenValid(token)) {
    console.log('Clearing invalid token from localStorage');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return true;
  }
  return false;
};

export const getTimeUntilTokenExpiry = (token) => {
  const payload = getTokenPayload(token);
  if (!payload || !payload.exp) {
    return null;
  }

  const expDate = new Date(payload.exp * 1000);
  const now = new Date();
  return expDate.getTime() - now.getTime();
};
