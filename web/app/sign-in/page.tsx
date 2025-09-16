'use client';

import { useEffect } from 'react';
import { navigateToSignIn } from '../utils/navigation';

export default function SignInRedirectPage() {
  useEffect(() => {
    // Redirect to game client for authentication
    navigateToSignIn();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="text-center">
        <div className="w-16 h-16 border-t-4 border-yellow-400 border-solid rounded-full animate-spin mx-auto mb-4"></div>
        <div>Redirecting to sign in...</div>
      </div>
    </div>
  );
}