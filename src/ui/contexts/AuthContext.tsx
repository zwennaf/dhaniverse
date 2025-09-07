import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  gameUsername: string;
  selectedCharacter?: string; // C1, C2, C3, or C4
}

interface AuthContextType {
  user: User | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  sendMagicLink: (email: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  verifyMagicLink: (token: string) => Promise<{ success: boolean; error?: string; isNewUser?: boolean; message?: string }>;
  signInWithGoogle: (googleToken: string, gameUsername?: string) => Promise<{ success: boolean; error?: string; isNewUser?: boolean }>;
  signInWithInternetIdentity: (identity: any) => Promise<{ success: boolean; error?: string; isNewUser?: boolean }>;
  signOut: () => Promise<void>;
  updateProfile: (gameUsername: string, selectedCharacter?: string) => Promise<{ success: boolean; error?: string }>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Use environment-based API URL
const API_BASE = import.meta.env.VITE_API_BASE_URL ||
  ((typeof window !== "undefined" && window.location.hostname === "localhost")
    ? "http://localhost:8000"
    : "https://api.dhaniverse.in");

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  // In-memory fallback if both localStorage & sessionStorage unavailable
  let memoryTokenRef: string | null = null;

  const safeStoreToken = (token: string) => {
    if (!token) return;
    try {
      localStorage.setItem('dhaniverse_token', token);
      return;
    } catch (e: any) {
      if (e && (e.name === 'QuotaExceededError' || e.code === 22)) {
        // Attempt minimal cleanup: remove old hints or stale tokens
        try {
          Object.keys(localStorage).forEach(k => {
            if (k.startsWith('dhaniverse_') && k !== 'dhaniverse_token') {
              try { localStorage.removeItem(k); } catch {}
            }
          });
          localStorage.setItem('dhaniverse_token', token);
          return; // success after cleanup
        } catch {}
        // Fallback to sessionStorage
        try {
          sessionStorage.setItem('dhaniverse_token', token);
          return;
        } catch {}
      }
    }
    // Final fallback to memory (volatile)
    memoryTokenRef = token;
  };

  const safeReadToken = (): string | null => {
    try { const t = localStorage.getItem('dhaniverse_token'); if (t) return t; } catch {}
    try { const t = sessionStorage.getItem('dhaniverse_token'); if (t) return t; } catch {}
    return memoryTokenRef;
  };

  // Check for existing session on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
  const token = safeReadToken();
      if (!token) {
        // Check for Internet Identity session if no token
        await checkInternetIdentitySession();
        setIsLoaded(true);
        return;
      }

      const response = await fetch(`${API_BASE}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        // Check if this is a ban response
        if (response.status === 403) {
          const data = await response.json();
          if (data.banned && data.banInfo) {
            // Store ban info for the BannedPage
            sessionStorage.setItem('banInfo', JSON.stringify(data.banInfo));
            // Don't remove token yet, just set user to null
            setUser(null);
            setIsLoaded(true);
            return;
          }
        }
        
        // Invalid token, remove it and check for II session
        try { localStorage.removeItem('dhaniverse_token'); } catch {}
        await checkInternetIdentitySession();
      }
    } catch (error) {
      console.error('Auth check error:', error);
      try { localStorage.removeItem('dhaniverse_token'); } catch {}
      await checkInternetIdentitySession();
    } finally {
      setIsLoaded(true);
    }
  };

  // Check for existing Internet Identity session
  const checkInternetIdentitySession = async () => {
    try {
      console.log('Checking for existing Internet Identity session...');
      const { AuthClient } = await import("@dfinity/auth-client");
      const authClient = await AuthClient.create();
      
      if (await authClient.isAuthenticated()) {
        console.log('Found existing Internet Identity session, attempting to restore...');
        const identity = authClient.getIdentity();
        
        if (!identity.getPrincipal().isAnonymous()) {
          const result = await signInWithInternetIdentity(identity);
          if (result.success) {
            console.log('Successfully restored Internet Identity session');
          } else {
            console.log('Failed to restore Internet Identity session:', result.error);
          }
        }
      }
    } catch (error) {
      console.log('Internet Identity session check failed:', error);
    }
  };  const sendMagicLink = async (email: string): Promise<{ success: boolean; error?: string; message?: string }> => {
    try {
      const response = await fetch(`${API_BASE}/auth/send-magic-link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        return { 
          success: true, 
          message: data.message 
        };
      } else {
        return { success: false, error: data.error || 'Failed to send magic link' };
      }
    } catch (error) {
      console.error('Send magic link error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const verifyMagicLink = async (token: string): Promise<{ success: boolean; error?: string; isNewUser?: boolean; message?: string }> => {
    try {
      const response = await fetch(`${API_BASE}/auth/verify-magic-link?token=${encodeURIComponent(token)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
  safeStoreToken(data.token);
        setUser(data.user);
        return { 
          success: true, 
          isNewUser: data.isNewUser,
          message: data.message 
        };
      } else {
        // Check if this is a ban response
        if (data.banned && data.banInfo) {
          // Store ban info for the BannedPage
          sessionStorage.setItem('banInfo', JSON.stringify(data.banInfo));
          return { success: false, error: 'BANNED' }; // Special error code
        }
        return { success: false, error: data.error || 'Invalid magic link' };
      }
    } catch (error) {
      console.error('Verify magic link error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };  const signInWithGoogle = async (googleToken: string, gameUsername?: string): Promise<{ success: boolean; error?: string; isNewUser?: boolean }> => {
    try {
      console.log('Starting Google sign-in with token:', googleToken ? 'Token present' : 'No token');
      console.log('API Base URL:', API_BASE);
      
      const body: any = { googleToken };
      // Prefer explicit param; otherwise look for a local hint saved by the button
      const usernameHint = gameUsername || localStorage.getItem('dhaniverse_google_username_hint') || undefined;
      if (usernameHint) {
        body.gameUsername = usernameHint;
      }

      console.log('Making POST request to:', `${API_BASE}/auth/google`);
      console.log('Request body:', { ...body, googleToken: googleToken ? '[REDACTED]' : 'MISSING' });

    const token = localStorage.getItem('dhaniverse_token');
    const response = await fetch(`${API_BASE}/auth/google`, {
        method: 'POST',
        headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      const data = await response.json();
      console.log('Response data:', data);

      if (response.ok) {
  safeStoreToken(data.token);
        setUser(data.user);
        return { success: true, isNewUser: data.isNewUser };
      } else {
        console.error('Google sign-in failed:', data);
        // Check if this is a ban response
        if (data.banned && data.banInfo) {
          // Store ban info for the BannedPage
          sessionStorage.setItem('banInfo', JSON.stringify(data.banInfo));
          return { success: false, error: 'BANNED' }; // Special error code
        }
        return { success: false, error: data.error || data.message || 'Google sign in failed' };
      }
    } catch (error) {
      console.error('Google sign in error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const signInWithInternetIdentity = async (identity: any): Promise<{ success: boolean; error?: string; isNewUser?: boolean }> => {
    try {
      console.log('Starting Internet Identity sign-in');
      
      // Get the principal from the identity
      const principal = identity.getPrincipal().toString();
      console.log('Internet Identity Principal:', principal);

      // Validate that we have a non-anonymous principal
      if (identity.getPrincipal().isAnonymous()) {
        return { success: false, error: 'Anonymous authentication not allowed' };
      }

      const response = await fetch(`${API_BASE}/auth/internet-identity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ principal }),
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (response.ok) {
  safeStoreToken(data.token);
        setUser(data.user);
        return { success: true, isNewUser: data.isNewUser };
      } else {
        console.error('Internet Identity sign-in failed:', data);
        // Check if this is a ban response
        if (data.banned && data.banInfo) {
          // Store ban info for the BannedPage
          sessionStorage.setItem('banInfo', JSON.stringify(data.banInfo));
          return { success: false, error: 'BANNED' }; // Special error code
        }
        return { success: false, error: data.error || data.message || 'Internet Identity sign in failed' };
      }
    } catch (error) {
      console.error('Internet Identity sign in error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const signOut = async (): Promise<void> => {
    // Remove local storage token
    localStorage.removeItem('dhaniverse_token');
    
    // Try to logout from Internet Identity if it exists
    try {
      const { AuthClient } = await import("@dfinity/auth-client");
      const authClient = await AuthClient.create();
      if (await authClient.isAuthenticated()) {
        await authClient.logout();
      }
    } catch (error) {
      console.log("Internet Identity logout not needed or failed:", error);
    }
    
    setUser(null);
  };

  const updateProfile = async (gameUsername: string, selectedCharacter?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const token = localStorage.getItem('dhaniverse_token');
      if (!token) {
        return { success: false, error: 'Not authenticated' };
      }

      const body: any = { gameUsername };
      if (selectedCharacter) {
        body.selectedCharacter = selectedCharacter;
      }

      const response = await fetch(`${API_BASE}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data.user);
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Update failed' };
      }
    } catch (error) {
      console.error('Update profile error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  // Refresh authentication status (can be called from components)
  const refreshAuth = async (): Promise<void> => {
    await checkAuth();
  };

  const isSignedIn = !!user;

  const value: AuthContextType = {
    user,
    isLoaded,
    isSignedIn,
    sendMagicLink,
    verifyMagicLink,
    signInWithGoogle,
    signInWithInternetIdentity,
    signOut,
    updateProfile,
    refreshAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// For compatibility with existing Clerk hooks
export const useUser = () => {
  const { user, isLoaded } = useAuth();
  return {
    user: user ? {
      ...user,
      unsafeMetadata: { gameUsername: user.gameUsername }
    } : null,
    isLoaded,
    isSignedIn: !!user
  };
};

export const useClerk = () => {
  const { signOut } = useAuth();
  return { signOut };
};
