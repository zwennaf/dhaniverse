import React, { useState, useEffect } from 'react';
import { GoogleAuthManager, suppressFedCMWarnings } from '../../../utils/googleAuth';

interface GoogleSignInButtonProps {
  onSuccess: (token: string) => void;
  onError: (error: string) => void;
  text?: string;
  disabled?: boolean;
  gameUsernameHint?: string; // optional username to pass during first-time Google account creation
}

const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onSuccess,
  onError,
  text = "Sign in with Google",
  disabled = false,
  gameUsernameHint,
}) => {
  const [loading, setLoading] = useState(false);
  const [authManager, setAuthManager] = useState<GoogleAuthManager | null>(null);

  // Initialize auth manager and suppress FedCM warnings
  useEffect(() => {
    suppressFedCMWarnings();
    
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'your-google-client-id';
    const manager = GoogleAuthManager.getInstance({
      clientId,
      autoSelect: false,
      cancelOnTapOutside: false,
      itpSupport: true,
    });
    
    setAuthManager(manager);
    manager.initialize();
  }, []);

  const renderGoogleButton = () => {
    // Fallback method using renderButton instead of prompt
    const { google } = window as any;
    if (google?.accounts?.id) {
      try {
        google.accounts.id.renderButton(
          document.getElementById('google-signin-button'),
          { 
            theme: 'outline', 
            size: 'large',
            text: 'signin_with',
            shape: 'rectangular'
          }
        );
      } catch (error) {
        console.warn('Google renderButton failed:', error);
      }
    }
  };

  const handleGoogleSignIn = async () => {
    if (disabled || loading || !authManager) return;

    setLoading(true);

    try {
      // Persist username hint if available
      if (gameUsernameHint) {
        try { 
          localStorage.setItem('dhaniverse_google_username_hint', gameUsernameHint); 
        } catch {}
      }

      const result = await authManager.signIn();
      
      if (result.success && result.credential) {
        console.log('Google sign-in successful');
        onSuccess(result.credential);
      } else {
        console.error('Google sign-in failed:', result.error);
        onError(result.error || 'Failed to sign in with Google');
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
      onError('Failed to initialize Google sign-in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={disabled || loading}
        className={`w-full flex justify-center items-center px-4 py-3 border border-gray-700 rounded-lg shadow-sm bg-black/70 text-gray-100 text-sm font-medium hover:bg-black/60 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-dhani-gold focus:ring-offset-black transition-colors duration-200 ${(disabled || loading) ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-gray-600 border-t-gray-200 rounded-full animate-spin mr-2"></div>
        ) : (
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        )}
        {text}
      </button>
      
      {/* Hidden container for Google button fallback */}
      <div id="google-signin-button" style={{ display: 'none' }}></div>
    </>
  );
};

export default GoogleSignInButton;
