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
  signOut: () => Promise<void>;
  updateProfile: (gameUsername: string, selectedCharacter?: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Use environment-based API URL
const API_BASE =
  (typeof window !== "undefined" && window.location.hostname === "localhost")
    ? "http://localhost:8000"
    : "https://dhaniverseapi.deno.dev";

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Check for existing session on mount
  useEffect(() => {
    checkAuth();
  }, []);
  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('dhaniverse_token');
      if (!token) {
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
        // Invalid token, remove it
        localStorage.removeItem('dhaniverse_token');
      }
    } catch (error) {
      console.error('Auth check error:', error);
      localStorage.removeItem('dhaniverse_token');
    } finally {
      setIsLoaded(true);
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
        localStorage.setItem('dhaniverse_token', data.token);
        setUser(data.user);
        return { 
          success: true, 
          isNewUser: data.isNewUser,
          message: data.message 
        };
      } else {
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
        localStorage.setItem('dhaniverse_token', data.token);
        setUser(data.user);
        return { success: true, isNewUser: data.isNewUser };
      } else {
        console.error('Google sign-in failed:', data);
        return { success: false, error: data.error || data.message || 'Google sign in failed' };
      }
    } catch (error) {
      console.error('Google sign in error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const signOut = async (): Promise<void> => {
    localStorage.removeItem('dhaniverse_token');
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

  const isSignedIn = !!user;

  const value: AuthContextType = {
    user,
    isLoaded,
    isSignedIn,
    sendMagicLink,
    verifyMagicLink,
    signInWithGoogle,
    signOut,
    updateProfile,
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
