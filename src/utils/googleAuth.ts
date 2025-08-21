/**
 * Google Authentication Utilities with FedCM Migration Support
 * This utility handles Google Sign-In with proper FedCM configuration to avoid deprecation warnings
 */

export interface GoogleAuthConfig {
  clientId: string;
  autoSelect?: boolean;
  cancelOnTapOutside?: boolean;
  itpSupport?: boolean;
}

export class GoogleAuthManager {
  private static instance: GoogleAuthManager;
  private isInitialized = false;
  private config: GoogleAuthConfig;

  constructor(config: GoogleAuthConfig) {
    this.config = config;
  }

  static getInstance(config?: GoogleAuthConfig): GoogleAuthManager {
    if (!GoogleAuthManager.instance) {
      if (!config) {
        throw new Error('GoogleAuthManager requires config on first initialization');
      }
      GoogleAuthManager.instance = new GoogleAuthManager(config);
    }
    return GoogleAuthManager.instance;
  }

  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      const { google } = window as any;
      
      if (!google?.accounts?.id) {
        console.warn('Google Identity Services not loaded');
        return false;
      }

      // Initialize with FedCM-compatible configuration
      await google.accounts.id.initialize({
        client_id: this.config.clientId,
        auto_select: this.config.autoSelect || false,
        cancel_on_tap_outside: this.config.cancelOnTapOutside || false,
        itp_support: this.config.itpSupport || true,
        ux_mode: 'popup',
        // FedCM migration configurations
        use_fedcm_for_prompt: true,
      });

      this.isInitialized = true;
      console.log('Google Authentication initialized with FedCM support');
      return true;
    } catch (error) {
      console.error('Failed to initialize Google Authentication:', error);
      return false;
    }
  }

  async signIn(): Promise<{ success: boolean; credential?: string; error?: string }> {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized) {
        return { success: false, error: 'Failed to initialize Google Authentication' };
      }
    }

    return new Promise((resolve) => {
      const { google } = window as any;
      
      // Set up callback for this specific sign-in attempt
      google.accounts.id.initialize({
        client_id: this.config.clientId,
        callback: (response: any) => {
          if (response.credential) {
            resolve({ success: true, credential: response.credential });
          } else {
            resolve({ success: false, error: 'No credential received' });
          }
        },
        auto_select: false,
        cancel_on_tap_outside: false,
        itp_support: true,
        ux_mode: 'popup',
        use_fedcm_for_prompt: true,
      });

      // Use renderButton approach to avoid deprecated prompt methods
      this.triggerSignInFlow();
    });
  }

  private triggerSignInFlow(): void {
    const { google } = window as any;
    
    try {
      // Create a temporary button container
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '-9999px';
      document.body.appendChild(tempContainer);

      // Render Google button
      google.accounts.id.renderButton(tempContainer, {
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
      });

      // Auto-click the button
      setTimeout(() => {
        const button = tempContainer.querySelector('div[role="button"]') as HTMLElement;
        if (button) {
          button.click();
        } else {
          // Fallback to prompt without deprecated notification handlers
          google.accounts.id.prompt();
        }
        
        // Clean up
        setTimeout(() => {
          if (document.body.contains(tempContainer)) {
            document.body.removeChild(tempContainer);
          }
        }, 1000);
      }, 100);

    } catch (error) {
      console.warn('Failed to trigger sign-in flow, using fallback:', error);
      // Last resort: use prompt without notification handlers
      google.accounts.id.prompt();
    }
  }

  // Disable One Tap to avoid FedCM warnings
  disableOneTap(): void {
    const { google } = window as any;
    if (google?.accounts?.id) {
      google.accounts.id.disableAutoSelect();
    }
  }

  // Sign out
  signOut(): void {
    const { google } = window as any;
    if (google?.accounts?.id) {
      google.accounts.id.disableAutoSelect();
    }
  }
}

// Global configuration to suppress FedCM warnings
export const suppressFedCMWarnings = (): void => {
  // Override console methods to filter out specific FedCM warnings
  const originalWarn = console.warn;
  const originalLog = console.log;

  console.warn = (...args: any[]) => {
    const message = args.join(' ');
    if (
      message.includes('GSI_LOGGER') ||
      message.includes('FedCM') ||
      message.includes('display_moment') ||
      message.includes('skipped_moment') ||
      message.includes('isNotDisplayed') ||
      message.includes('isSkippedMoment') ||
      message.includes('isDismissedMoment')
    ) {
      // Suppress these specific warnings
      return;
    }
    originalWarn.apply(console, args);
  };

  console.log = (...args: any[]) => {
    const message = args.join(' ');
    if (message.includes('GSI_LOGGER')) {
      // Suppress GSI_LOGGER messages
      return;
    }
    originalLog.apply(console, args);
  };
};

// Initialize FedCM support detection
export const detectFedCMSupport = (): boolean => {
  return 'IdentityCredential' in window && 'navigator' in window && 'credentials' in navigator;
};
