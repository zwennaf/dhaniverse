import React, { useState } from 'react';

interface GoogleSignInButtonProps {
  onSuccess: (token: string) => void;
  onError: (error: string) => void;
  text?: string;
  disabled?: boolean;
}

const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onSuccess,
  onError,
  text = "Sign in with Google",
  disabled = false
}) => {
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    if (disabled || loading) return;
    
    setLoading(true);
    
    try {
      // Initialize Google Sign-In
      const { google } = window as any;
      
      if (!google) {
        throw new Error('Google Sign-In not loaded');
      }

      // Configure the client
      await google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || 'your-google-client-id',
        callback: async (response: any) => {
          try {
            // The response contains the JWT token from Google
            const token = response.credential;
            onSuccess(token);
          } catch (error) {
            console.error('Google sign-in callback error:', error);
            onError('Failed to process Google sign-in');
          } finally {
            setLoading(false);
          }
        },
        ux_mode: 'popup',
        auto_select: false,
      });

      // Prompt the user to sign in
      google.accounts.id.prompt();
      
    } catch (error) {
      console.error('Google sign-in error:', error);
      onError('Failed to initialize Google sign-in');
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleGoogleSignIn}
      disabled={disabled || loading}
      className={`
        w-full flex justify-center items-center px-4 py-3 border border-gray-600
        rounded-lg shadow-sm bg-white text-gray-900 text-sm font-medium
        hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 
        focus:ring-dhani-gold transition-colors duration-200
        ${(disabled || loading) ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin mr-2"></div>
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
  );
};

export default GoogleSignInButton;
