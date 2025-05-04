import React, { useState, useEffect } from 'react';
import { GoogleOneTap, useSignUp } from '@clerk/clerk-react';
import { useNavigate, Link } from 'react-router-dom';
import PixelButton from '../atoms/PixelButton';

const CustomSignUp: React.FC = () => {
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

  useEffect(() => {
    if (!isLoaded || !signUp) return;

    // Check if we're returning from an OAuth flow
    const searchParams = new URLSearchParams(window.location.search);
    const createdSessionId = searchParams.get('createdSessionId');

    if (createdSessionId) {
      setActive({ session: createdSessionId })
        .then(() => navigate('/profile'))
        .catch(err => setError(err.message || 'Failed to set active session'));
    }
  }, [isLoaded, signUp, setActive, navigate]);

  // Render loading state if necessary
  if (!isLoaded || !signUp || !setActive) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading authentication...</div>
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
        <PixelButton 
          type="button" 
          disabled={loading} 
          onClick={handleGoogleSignUp}
          className="w-full bg-dhani-dark hover:bg-dhani-darkgray border border-dhani-gold/40 text-dhani-text"
        >
          Continue with Google
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