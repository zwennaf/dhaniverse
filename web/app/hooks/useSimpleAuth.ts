import { useState, useEffect, useCallback } from 'react';
import { getApiUrl } from '../utils/navigation';

export interface SimpleUser {
  id?: string;
  name?: string;
  isLoggedIn: boolean;
  token?: string | null;
}

const isClient = typeof window !== 'undefined';

export const useSimpleAuth = () => {
  const [user, setUser] = useState<SimpleUser>({ isLoggedIn: false, token: null });
  const [isLoaded, setIsLoaded] = useState(false);

  const refreshSession = useCallback(async () => {
    if (!isClient) return;

    try {
  const resp = await fetch(getApiUrl('/session'), {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (resp.ok) {
        const json = await resp.json();
        if (json && json.user) {
          setUser({ ...json.user, isLoggedIn: true });
          setIsLoaded(true);
          return;
        }
      }
    } catch (err) {
      // ignore network errors — fallback to localStorage below
      // console.warn('session refresh failed', err);
    }

    // Fallback: check localStorage token (legacy behavior)
    if (isClient) {
      const token = localStorage.getItem('dhaniverse_token');
      setUser({ isLoggedIn: !!token, token: token });
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const signOut = useCallback(async () => {
    if (!isClient) return;

    // Call server signout to clear cookie scoped to .dhaniverse.in
    try {
  await fetch(getApiUrl('/signout'), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      // ignore
    }

    // Local fallback cleanup
    try {
      localStorage.removeItem('dhaniverse_token');
    } catch (e) {
      // noop
    }

    setUser({ isLoggedIn: false, token: null });
  }, []);

  return {
    user,
    isLoaded,
    isSignedIn: user.isLoggedIn,
    signOut,
    refreshSession,
  };
};