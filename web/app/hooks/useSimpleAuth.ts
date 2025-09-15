import { useState, useEffect } from 'react';

export interface SimpleUser {
  isLoggedIn: boolean;
  token: string | null;
}

export const useSimpleAuth = () => {
  const [user, setUser] = useState<SimpleUser>({ isLoggedIn: false, token: null });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Simple check for JWT token in localStorage
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('dhaniverse_token');
      setUser({
        isLoggedIn: !!token,
        token: token
      });
      setIsLoaded(true);
    }
  }, []);

  return {
    user,
    isLoaded,
    isSignedIn: user.isLoggedIn
  };
};