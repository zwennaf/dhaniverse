import React, { useState, useEffect } from 'react';
import { useSignIn, useUser } from '@clerk/clerk-react';
import { useNavigate, Link } from 'react-router-dom';
import PixelButton from '../atoms/PixelButton';

// Simplified device detection function
const isMobileDevice = () => {
  if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }
  return false;
};

// Mobile view component - completely separate from the authentication logic
const MobileView = () => (
  <div style={{
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    zIndex: 9999
  }}>
    <div style={{
      backgroundColor: '#282828',
      padding: '24px',
      borderRadius: '16px',
      width: '90%',
      maxWidth: '400px',
      boxShadow: '0 4px 12px rgba(255, 199, 0, 0.2)',
      textAlign: 'center',
      color: 'white'
    }}>
      <h1 style={{
        fontSize: '24px',
        color: '#FFC700',
        marginBottom: '16px',
        fontWeight: 'bold'
      }}>
        Desktop Only Experience
      </h1>
      <p style={{
        margin: '16px 0'
      }}>
        Dhaniverse is currently optimized for desktop computers only.
        Please visit us on a laptop or desktop computer for the best experience.
      </p>
      <div style={{
        width: '80px',
        height: '80px',
        margin: '20px auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1a1a1a',
        borderRadius: '8px'
      }}>
        <span style={{fontSize: '40px'}}>🖥️</span>
      </div>
      <p style={{
        fontSize: '14px',
        color: 'rgba(255,255,255,0.6)'
      }}>
        We're considering mobile support in future updates!
      </p>
    </div>
  </div>
);

const CustomSignIn: React.FC = () => {
  // Check for mobile immediately before any other logic
  if (isMobileDevice()) {
    return <MobileView />;
  }

  // Continue with the regular component logic for desktop users
  const navigate = useNavigate();
  const { signIn, setActive, isLoaded } = useSignIn();
  const { user } = useUser();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [needToSignUp, setNeedToSignUp] = useState(false);
  const [authLoadTimeout, setAuthLoadTimeout] = useState(false);

  // Set a timeout for auth loading to prevent indefinite loading screens
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!isLoaded) {
        setAuthLoadTimeout(true);
        console.warn("Authentication loading timed out");
      }
    }, 8000); // 8 seconds timeout

    return () => clearTimeout(timeoutId);
  }, [isLoaded]);

  // Simple effect to handle OAuth callback and check for stored errors
  useEffect(() => {
    if (!isLoaded || !signIn) return;
    
    // Check for stored error from previous redirect
    try {
      const storedError = localStorage.getItem('dhaniverse_signin_error');
      if (storedError) {
        setError(storedError);
        setNeedToSignUp(true);
        localStorage.removeItem('dhaniverse_signin_error');
        return;
      }
    } catch (err) {
      console.error("Error accessing localStorage:", err);
    }
    
    // Check if we're returning from an OAuth flow
    const searchParams = new URLSearchParams(window.location.search);
    const createdSessionId = searchParams.get('createdSessionId');
    
    // If we have a session, activate it
    if (createdSessionId) {
      setLoading(true);
      setActive({ session: createdSessionId })
        .then(() => navigate('/profile'))
        .catch(err => {
          console.error("Session activation error:", err);
          if (err.message && (
              err.message.includes('not found') || 
              err.message.includes('no account') ||
              err.message.toLowerCase().includes('oauth')
            )) {
            setError('No account exists with this Google account. Please sign up first.');
            setNeedToSignUp(true);
          } else {
            setError(err.message || 'Failed to activate session');
          }
        })
        .finally(() => setLoading(false));
    }
  }, [isLoaded, signIn, setActive, navigate]);

  // Handle user data after successful authentication
  useEffect(() => {
    if (user) {
      if (user.firstName && !user.username) {
        user.update({
          username: user.firstName,
          unsafeMetadata: {
            ...user.unsafeMetadata,
            gameUsername: user.firstName
          }
        }).catch(err => {
          console.error('Error updating user data:', err);
        });
      }
    }
  }, [user]);

  // Show error with retry button if auth loading times out
  if (authLoadTimeout) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <div className="text-red-400 mb-4">Authentication service is taking too long to load.</div>
        <div className="text-white mb-4">This may be due to a slow network connection or browser privacy settings.</div>
        <PixelButton 
          onClick={() => window.location.reload()} 
          className="bg-dhani-gold text-black"
        >
          Retry
        </PixelButton>
        <div className="text-white mt-4 text-sm">
          <p>If this issue persists:</p>
          <ul className="list-disc pl-5 mt-2">
            <li>Check your internet connection</li>
            <li>Try disabling content blockers</li>
            <li>Ensure cookies are enabled</li>
          </ul>
        </div>
      </div>
    );
  }

  // Default loading screen with improved feedback
  if (!isLoaded || !signIn || !setActive) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center">
        <div className="text-white mb-4">Loading authentication...</div>
        <div className="w-16 h-16 border-t-4 border-dhani-gold border-solid rounded-full animate-spin"></div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await signIn.create({ identifier: email, password });
      if (result.status === 'complete' && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        navigate('/profile');
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.longMessage || err.message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };
  
  const handleGoogleSignIn = async () => {
    try {
      setError('');
      setNeedToSignUp(false);
      setLoading(true);
      
      // Store a flag indicating this was a Google sign-in attempt
      localStorage.setItem('dhaniverse_google_signin_attempt', 'true');
      
      // Try to authenticate with Google
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: `${window.location.origin}/sign-up`,
        redirectUrlComplete: `${window.location.origin}/profile`,
      });
    } catch (err: any) {
      // If we get an immediate error (rare, but possible)
      console.error("Google sign-in error:", err);
      
      if (err.message && (
          err.message.includes('not found') || 
          err.message.includes('no account') ||
          err.message.toLowerCase().includes('oauth')
        )) {
        localStorage.setItem('dhaniverse_signin_error', 'No account exists with this Google account. Please sign up first.');
      } else {
        setError(err.message || 'Google sign in failed');
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div 
        className="absolute inset-0 z-0" 
        style={{
          backgroundImage: `url('/UI/bg.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(8px)'
        }}
      />
      <form onSubmit={handleSubmit} className="bg-dhani-darkgray p-6 rounded-2xl shadow-lg shadow-dhani-gold/20 w-full max-w-md space-y-4 z-10">
        <h1 className="text-3xl font-tickerbit tracking-widest uppercase text-dhani-text text-center">Sign In to <span className='text-dhani-gold pixel-glow'> Dhaniverse </span></h1>
        
        {/* Enhanced error styling with sign up option when needed */}
        {error && (
          <div className="text-red-400 text-sm font-tickerbit p-2 mb-2 border border-red-400 rounded bg-red-900/20">
            ⚠️ {error}
            {needToSignUp && (
              <div className="mt-2 pt-2 border-t border-red-400/30">
                <Link to="/sign-up" className="text-dhani-gold hover:underline">
                  Click here to create an account
                </Link>
              </div>
            )}
          </div>
        )}
        
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          className="w-full bg-dhani-dark border pixel-corners border-dhani-gold/30 py-2 px-3 text-dhani-text font-robert focus:outline-none focus:ring-1 focus:ring-dhani-gold"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
          className="w-full bg-dhani-dark border rounded-2xl border-dhani-gold/30 py-2 px-3 text-dhani-text font-robert focus:outline-none focus:ring-1 focus:ring-dhani-gold"
        />
        <PixelButton type="submit" disabled={loading} className="w-full">
          {loading ? 'Signing In...' : 'Sign In'}
        </PixelButton>
        <PixelButton 
          type="button" 
          disabled={loading} 
          onClick={handleGoogleSignIn}
          className="w-full bg-dhani-dark hover:bg-dhani-darkgray border border-dhani-gold/40 text-dhani-text"
        >
          Continue with Google
        </PixelButton>
        <p className="text-center text-dhani-text/70 text-sm font-robert">
          Don't have an account?{' '}
          <Link to="/sign-up" className="text-dhani-gold hover:underline hover:text-dhani-gold/80">
            Sign Up
          </Link>
        </p>
      </form>
    </div>
  );
};

export default CustomSignIn;