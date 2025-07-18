import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  gameUsername: string;
}

interface AuthContextType {
  user: User | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string; isNewUser?: boolean; message?: string }>;
  signUp: (email: string, password: string, gameUsername: string) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: (googleToken: string, gameUsername?: string) => Promise<{ success: boolean; error?: string; isNewUser?: boolean }>;
  signOut: () => Promise<void>;
  updateProfile: (gameUsername: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Use environment-based API URL
const API_BASE = import.meta.env.DEV ? 'http://localhost:8000' : 'https://dhaniverseapi.deno.dev';

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
  };  const signIn = async (email: string, password: string): Promise<{ success: boolean; error?: string; isNewUser?: boolean; message?: string }> => {
    try {
      // First attempt: try to sign in normally
      let response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      let data = await response.json();

      // If user doesn't exist, try auto-registration
      if (!response.ok && data.error === 'Invalid email or password') {
        // Attempt auto-registration
        response = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password, autoRegister: true }),
        });

        data = await response.json();
      }

      if (response.ok) {
        localStorage.setItem('dhaniverse_token', data.token);
        setUser(data.user);
        return { 
          success: true, 
          isNewUser: data.isNewUser,
          message: data.message 
        };
      } else {
        return { success: false, error: data.error || 'Sign in failed' };
      }
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };  const signUp = async (email: string, password: string, gameUsername: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, gameUsername }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('dhaniverse_token', data.token);
        setUser(data.user);
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Sign up failed' };
      }
    } catch (error) {
      console.error('Sign up error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };  const signInWithGoogle = async (googleToken: string, gameUsername?: string): Promise<{ success: boolean; error?: string; isNewUser?: boolean }> => {
    try {
      console.log('Starting Google sign-in with token:', googleToken ? 'Token present' : 'No token');
      console.log('API Base URL:', API_BASE);
      
      const body: any = { googleToken };
      if (gameUsername) {
        body.gameUsername = gameUsername;
      }

      console.log('Making POST request to:', `${API_BASE}/auth/google`);
      console.log('Request body:', { ...body, googleToken: googleToken ? '[REDACTED]' : 'MISSING' });

      const response = await fetch(`${API_BASE}/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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

  const updateProfile = async (gameUsername: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const token = localStorage.getItem('dhaniverse_token');
      if (!token) {
        return { success: false, error: 'Not authenticated' };
      }      const response = await fetch(`${API_BASE}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ gameUsername }),
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
    signIn,
    signUp,
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
