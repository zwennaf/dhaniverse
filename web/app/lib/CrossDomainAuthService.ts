/**
 * Cross-Domain Authentication Service for Web Client
 * 
 * Handles JWT-based authentication that works across dhaniverse.in subdomains.
 * Manages HTTP-only cookies, token refresh, and session validation.
 */

export interface DhaniverseUser {
  id: string;
  email: string;
  gameUsername?: string;
  selectedCharacter?: string;
  provider: 'google' | 'magic-link' | 'internet-identity';
  createdAt: string;
  lastLoginAt: string;
}

export interface AuthTokenPayload {
  iat?: number;
  exp?: number;
  iss?: string;
  sub?: string;
  userId: string;
  email: string;
  gameUsername?: string;
  provider: string;
  sessionId: string;
}

export interface AuthResponse {
  success: boolean;
  user?: DhaniverseUser;
  error?: string;
  isNewUser?: boolean;
  message?: string;
}

export class CrossDomainAuthService {
  private static instance: CrossDomainAuthService;
  private user: DhaniverseUser | null = null;
  private isInitialized = false;
  private authListeners: ((user: DhaniverseUser | null) => void)[] = [];

  // API base URL with environment detection (prefer public env var set at build/runtime)
  private apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_API_BASE_URL ||
    ((typeof window !== "undefined" && window.location.hostname === "localhost")
      ? "http://localhost:8000"
      : "https://api.dhaniverse.in");

  private constructor() {}

  public static getInstance(): CrossDomainAuthService {
    if (!CrossDomainAuthService.instance) {
      CrossDomainAuthService.instance = new CrossDomainAuthService();
    }
    return CrossDomainAuthService.instance;
  }

  /**
   * Initialize the auth service - checks for existing session
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.refreshSession();
      this.isInitialized = true;
    } catch (error) {
      console.warn('Auth initialization failed:', error);
      this.isInitialized = true;
    }
  }

  /**
   * Add listener for auth state changes
   */
  public onAuthStateChanged(listener: (user: DhaniverseUser | null) => void): () => void {
    this.authListeners.push(listener);
    // Immediately call with current state
    listener(this.user);
    
    // Return unsubscribe function
    return () => {
      const index = this.authListeners.indexOf(listener);
      if (index > -1) {
        this.authListeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners of auth state change
   */
  private notifyAuthStateChanged(): void {
    this.authListeners.forEach(listener => listener(this.user));
  }

  /**
   * Get current user
   */
  public getCurrentUser(): DhaniverseUser | null {
    return this.user;
  }

  /**
   * Check if user is authenticated
   */
  public isAuthenticated(): boolean {
    return this.user !== null;
  }

  /**
   * Refresh session from server - checks for valid JWT cookie
   */
  public async refreshSession(): Promise<DhaniverseUser | null> {
    try {
      const response = await fetch(`${this.apiBase}/auth/session`, {
        method: 'GET',
        credentials: 'include', // Include cookies
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        this.setUser(null);
        return null;
      }

      const data = await response.json();
      if (data.success && data.user) {
        this.setUser(data.user);
        return data.user;
      } else {
        this.setUser(null);
        return null;
      }
    } catch (error) {
      console.error('Session refresh failed:', error);
      this.setUser(null);
      return null;
    }
  }

  /**
   * Sign in with Google token
   */
  public async signInWithGoogle(googleToken: string, gameUsername?: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.apiBase}/auth/google`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          googleToken,
          gameUsername,
        }),
      });

      const data = await response.json();
      
      if (data.success && data.user) {
        this.setUser(data.user);
      }

      return data;
    } catch (error) {
      console.error('Google sign-in failed:', error);
      return {
        success: false,
        error: 'Network error during Google sign-in',
      };
    }
  }

  /**
   * Send magic link to email
   */
  public async sendMagicLink(email: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.apiBase}/auth/magic-link/send`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      return await response.json();
    } catch (error) {
      console.error('Magic link send failed:', error);
      return {
        success: false,
        error: 'Network error while sending magic link',
      };
    }
  }

  /**
   * Verify magic link token
   */
  public async verifyMagicLink(token: string, gameUsername?: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.apiBase}/auth/magic-link/verify`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          gameUsername,
        }),
      });

      const data = await response.json();
      
      if (data.success && data.user) {
        this.setUser(data.user);
      }

      return data;
    } catch (error) {
      console.error('Magic link verification failed:', error);
      return {
        success: false,
        error: 'Network error during magic link verification',
      };
    }
  }

  /**
   * Sign in with Internet Identity
   */
  public async signInWithInternetIdentity(identity: any, gameUsername?: string): Promise<AuthResponse> {
    try {
      // Extract principal from identity
      const principal = identity.getPrincipal().toString();
      
      const response = await fetch(`${this.apiBase}/auth/internet-identity`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          principal,
          gameUsername,
        }),
      });

      const data = await response.json();
      
      if (data.success && data.user) {
        this.setUser(data.user);
      }

      return data;
    } catch (error) {
      console.error('Internet Identity sign-in failed:', error);
      return {
        success: false,
        error: 'Network error during Internet Identity sign-in',
      };
    }
  }

  /**
   * Update user profile
   */
  public async updateProfile(gameUsername: string, selectedCharacter?: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.apiBase}/auth/profile`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gameUsername,
          selectedCharacter,
        }),
      });

      const data = await response.json();
      
      if (response.ok && data.success && data.user) {
        this.setUser(data.user);
        return { success: true, user: data.user };
      } else {
        return {
          success: false,
          error: data.error || 'Failed to update profile',
        };
      }
    } catch (error) {
      console.error('Profile update failed:', error);
      return {
        success: false,
        error: 'Network error during profile update',
      };
    }
  }

  /**
   * Sign out user and clear session
   */
  public async signOut(): Promise<void> {
    try {
      // Call server to clear the HTTP-only cookie
      await fetch(`${this.apiBase}/auth/signout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Server signout failed:', error);
    }

    // Clear local state regardless of server response
    this.setUser(null);

    // Also clear any legacy localStorage tokens
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('dhaniverse_token');
        sessionStorage.removeItem('dhaniverse_token');
      }
    } catch (error) {
      // Ignore storage errors
    }
  }

  /**
   * Set user and notify listeners
   */
  private setUser(user: DhaniverseUser | null): void {
    this.user = user;
    this.notifyAuthStateChanged();
  }

  /**
   * Get auth headers for API requests (fallback for legacy API calls)
   */
  public getAuthHeaders(): Record<string, string> {
    // For cross-domain auth, we rely on HTTP-only cookies
    // This method is kept for backward compatibility with existing API calls
    return {};
  }

  /**
   * Check if token is expired (for client-side validation)
   */
  public isTokenExpired(): boolean {
    // Since we're using HTTP-only cookies, we can't check expiry client-side
    // The server will handle token validation and refresh
    return false;
  }

  /**
   * Force token refresh (useful for manual refresh)
   */
  public async forceRefresh(): Promise<DhaniverseUser | null> {
    return await this.refreshSession();
  }
}

// Export singleton instance
export const crossDomainAuthService = CrossDomainAuthService.getInstance();

// Make available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).crossDomainAuthService = crossDomainAuthService;
}