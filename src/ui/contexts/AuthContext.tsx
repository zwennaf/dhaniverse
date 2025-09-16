import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { crossDomainAuthService, DhaniverseUser, AuthResponse } from '../../services/CrossDomainAuthService';
import { authService as icpAuthService } from '../../services/auth';

interface AuthContextType {
  user: DhaniverseUser | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  sendMagicLink: (email: string) => Promise<AuthResponse>;
  verifyMagicLink: (token: string) => Promise<AuthResponse>;
  signInWithGoogle: (googleToken: string, gameUsername?: string) => Promise<AuthResponse>;
  signInWithInternetIdentity: (identity: any) => Promise<AuthResponse>;
  signOut: () => Promise<void>;
  updateProfile: (gameUsername: string, selectedCharacter?: string) => Promise<AuthResponse>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<DhaniverseUser | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Initialize the auth service and listen for auth state changes
    const initAuth = async () => {
      await crossDomainAuthService.initialize();
      
      // Set up auth state listener
      const unsubscribe = crossDomainAuthService.onAuthStateChanged((user) => {
        setUser(user);
        setIsLoaded(true);
      });

      // Also check for ICP session if no cross-domain session exists
      if (!user) {
        try {
          const isICPAuth = await icpAuthService.isAuthenticated();
          if (isICPAuth) {
            const principal = await icpAuthService.getPrincipal();
            // Convert ICP auth to cross-domain auth
            await signInWithInternetIdentity({ getPrincipal: () => ({ toString: () => principal }) });
          }
        } catch (error) {
          console.warn('ICP auth check failed:', error);
        }
      }

      return unsubscribe;
    };

    let unsubscribe: (() => void) | undefined;
    
    initAuth().then((unsub) => {
      unsubscribe = unsub;
    });

    // Cleanup listener on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const sendMagicLink = async (email: string): Promise<AuthResponse> => {
    return await crossDomainAuthService.sendMagicLink(email);
  };

  const verifyMagicLink = async (token: string): Promise<AuthResponse> => {
    return await crossDomainAuthService.verifyMagicLink(token);
  };

  const signInWithGoogle = async (googleToken: string, gameUsername?: string): Promise<AuthResponse> => {
    return await crossDomainAuthService.signInWithGoogle(googleToken, gameUsername);
  };

  const signInWithInternetIdentity = async (identity: any): Promise<AuthResponse> => {
    // First authenticate with ICP
    try {
      await icpAuthService.login();
    } catch (error) {
      console.warn('ICP login failed:', error);
    }

    // Then authenticate with cross-domain service
    return await crossDomainAuthService.signInWithInternetIdentity(identity);
  };

  const updateProfile = async (gameUsername: string, selectedCharacter?: string): Promise<AuthResponse> => {
    return await crossDomainAuthService.updateProfile(gameUsername, selectedCharacter);
  };

  const signOut = async (): Promise<void> => {
    // Sign out from both cross-domain and ICP
    await crossDomainAuthService.signOut();
    try {
      await icpAuthService.logout();
    } catch (error) {
      console.warn('ICP logout failed:', error);
    }

    // Clean up legacy localStorage tokens
    try {
      localStorage.removeItem('dhaniverse_token');
      sessionStorage.removeItem('dhaniverse_token');
    } catch (error) {
      // Ignore storage errors
    }
  };

  const refreshAuth = async (): Promise<void> => {
    await crossDomainAuthService.refreshSession();
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoaded,
      isSignedIn: !!user,
      sendMagicLink,
      verifyMagicLink,
      signInWithGoogle,
      signInWithInternetIdentity,
      signOut,
      updateProfile,
      refreshAuth,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

  export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
      throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
  }

  // Backwards-compatible helper used by UI components that expect `useUser`
  export function useUser() {
    const { user, isLoaded, isSignedIn } = useAuth();
    return { user, isLoaded, isSignedIn };
  }