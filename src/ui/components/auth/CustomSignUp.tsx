import React, { useState, useEffect } from 'react';
import { GoogleOneTap, useSignUp } from '@clerk/clerk-react';
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

const CustomSignUp: React.FC = () => {
  // Check for mobile immediately before any other logic
  if (isMobileDevice()) {
    return <MobileView />;
  }

  // Continue with the regular component logic for desktop users
  const navigate = useNavigate();
  const { signUp, setActive, isLoaded } = useSignUp();
  
  // Always declare all hooks at the top level, before any conditional logic
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [gameUsername, setGameUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [comingFromSignIn, setComingFromSignIn] = useState(false);
  const [authLoadTimeout, setAuthLoadTimeout] = useState(false);

  // Set a timeout for auth loading to prevent indefinite loading screens
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (!isLoaded) {
        setAuthLoadTimeout(true);
        console.warn("Authentication loading timed out on sign-up page");
      }
    }, 8000); // 8 seconds timeout

    return () => clearTimeout(timeoutId);
  }, [isLoaded]);

  useEffect(() => {
    if (!isLoaded || !signUp) return;

    // Check if we're coming from a Google sign-in attempt
    try {
      const googleSignInAttempt = localStorage.getItem('dhaniverse_google_signin_attempt');
      if (googleSignInAttempt === 'true') {
        setError('You need to create an account first. Please sign up with Google below.');
        setComingFromSignIn(true);
        localStorage.removeItem('dhaniverse_google_signin_attempt');
      }
    } catch (err) {
      console.error("Error accessing localStorage:", err);
    }

    // Check if we're returning from an OAuth flow
    const searchParams = new URLSearchParams(window.location.search);
    const createdSessionId = searchParams.get('createdSessionId');

    if (createdSessionId) {
      setActive({ session: createdSessionId })
        .then(() => navigate('/profile'))
        .catch(err => setError(err.message || 'Failed to set active session'));
    }
  }, [isLoaded, signUp, setActive, navigate]);

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

  // Render loading state if necessary with improved loading indicator
  if (!isLoaded || !signUp || !setActive) {
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
      // @ts-ignore include username and gameUsername metadata
      await signUp.create({
        emailAddress: email,
        password,
        username: gameUsername,
        unsafeMetadata: { gameUsername },
        strategy: 'email_code',
        redirectUrlComplete: window.location.origin + '/profile'
      } as any);
      setCodeSent(true);
      setLoading(false);
      return;
    } catch (err: any) {
      setError(err.errors?.[0]?.longMessage || err.message || 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError('');
    setLoading(true);
    try {
      // Clear any previous sign-in attempt flag
      localStorage.removeItem('dhaniverse_google_signin_attempt');
      
      await signUp.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: `${window.location.origin}/sign-up`,
        redirectUrlComplete: `${window.location.origin}/profile`,
      });
    } catch (err: any) {
      setError(err.message || 'Google sign up failed');
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await signUp.attemptEmailAddressVerification({ code: verificationCode });
      if (result.status === 'complete') {
        // Ensure we have a session to activate
        if (result.createdSessionId) {
          await setActive({ session: result.createdSessionId });
        }
        // Always redirect to profile upon successful verification
        navigate('/profile');
      } else {
        setError('Verification failed. Please check your code and try again.');
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.longMessage || err.message || 'Verification error');
    } finally {
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
      {!codeSent ? (
      <form onSubmit={handleSubmit} className="bg-dhani-darkgray p-6 rounded-2xl shadow-lg shadow-dhani-gold/20 w-full max-w-md space-y-4 z-10">
        <h1 className="text-3xl font-tickerbit tracking-widest uppercase text-dhani-text text-center">Sign Up for <span className='text-dhani-gold pixel-glow'> Dhaniverse </span></h1>
        
        {/* Enhanced error styling to match Profile.tsx */}
        {error && (
          <div className="text-red-400 text-sm font-tickerbit p-2 mb-2 border border-red-400 rounded bg-red-900/20">
            ⚠️ {error}
          </div>
        )}
        
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          className="w-full bg-dhani-dark border rounded-2xl border-dhani-gold/30 py-2 px-3 text-dhani-text font-robert focus:outline-none focus:ring-1 focus:ring-dhani-gold"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
          className="w-full bg-dhani-dark border rounded-2xl border-dhani-gold/30 py-2 px-3 text-dhani-text font-robert focus:outline-none focus:ring-1 focus:ring-dhani-gold"
        />
        <input
          type="text"
          value={gameUsername}
          onChange={(e) => setGameUsername(e.target.value)}
          placeholder="In-Game Username"
          required
          className={`w-full bg-dhani-dark border rounded-2xl py-2 px-3 text-dhani-text font-robert focus:outline-none focus:ring-1 focus:ring-dhani-gold ${!gameUsername || gameUsername.trim().length < 3 ? 'border-red-400' : 'border-dhani-gold/30'}`}
        />
        <PixelButton type="submit" disabled={loading} className="w-full">
          {loading ? 'Signing Up...' : 'Sign Up'}
        </PixelButton>
        <div className="relative my-4 flex items-center justify-center">
          <div className="border-t border-dhani-gold/20 w-full"></div>
          <span className="bg-dhani-darkgray px-3 text-sm text-dhani-text/60">or</span>
          <div className="border-t border-dhani-gold/20 w-full"></div>
        </div>
        
        {/* Highlight the Google button with a smooth shimmer effect if coming from sign-in attempt */}
        <PixelButton 
          type="button" 
          disabled={loading} 
          onClick={handleGoogleSignUp}
          className={`w-full transition-all duration-300 ${
            comingFromSignIn 
            ? "shimmer-effect hover:text-dhani-text hover:bg-transparent bg-dhani-gold" 
            : "bg-dhani-dark hover:bg-dhani-darkgray border border-dhani-gold/40 text-dhani-text"
          }`}
          style={comingFromSignIn ? {
            '--shimmer-base-color': '#FFFFFF',
            '--shimmer-highlight-color': '#FFFFFF',
            '--shimmer-text-color': '#000'
          } as React.CSSProperties : {}}
        >
          {comingFromSignIn ? '→ Sign Up with Google ←' : 'Continue with Google'}
        </PixelButton>
      <GoogleOneTap />
        <p className="text-center text-dhani-text/70 text-sm font-robert">
          Already have an account?{' '}
          <Link to="/sign-in" className="text-dhani-gold hover:underline hover:text-dhani-gold/80">
            Sign In
          </Link>
        </p>
      </form>
      ) : (
      <form onSubmit={handleVerifyCode} className="bg-dhani-darkgray p-6 rounded-2xl shadow-lg w-full max-w-md space-y-4 z-10">
        <h2 className="text-xl text-center text-dhani-text">Enter verification code</h2>
        
        {/* Enhanced error styling for verification code form */}
        {error && (
          <div className="text-red-400 text-sm font-tickerbit p-2 mb-2 border border-red-400 rounded bg-red-900/20">
            ⚠️ {error}
          </div>
        )}
        
        <input
          type="text"
          value={verificationCode}
          onChange={(e) => setVerificationCode(e.target.value)}
          placeholder="6-digit code"
          required
          className="w-full bg-dhani-dark border rounded-2xl py-2 px-3 text-dhani-text"
        />
        <PixelButton type="submit" disabled={loading} className="w-full">
          {loading ? 'Verifying...' : 'Verify Code'}
        </PixelButton>
      </form>
      )}
    </div>
  );
};

export default CustomSignUp;