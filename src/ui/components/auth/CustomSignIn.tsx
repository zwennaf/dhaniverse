import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import PixelButton from '../atoms/PixelButton';
import GoogleSignInButton from './GoogleSignInButton';

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

const CustomSignIn = () => {
  // Check for mobile immediately before any other logic
  if (isMobileDevice()) {
    return <MobileView />;
  }
  // Continue with the regular component logic for desktop users
  const navigate = useNavigate();
  const { signIn, signInWithGoogle, isLoaded } = useAuth();  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Clear error on input change
  useEffect(() => {
    if (error) setError('');
  }, [email, password]);

  // Default loading screen with improved feedback
  if (!isLoaded) {
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
    
    const result = await signIn(email, password);
    
    if (result.success) {
      navigate('/profile');
    } else {
      setError(result.error || 'Sign in failed');
    }
    
    setLoading(false);
  };  const handleGoogleSuccess = async (googleToken: string) => {
    setLoading(true);
    setError('');
    
    const result = await signInWithGoogle(googleToken);
    
    if (result.success) {
      // Navigate to profile - new users will be prompted to set username there
      navigate('/profile');
    } else {
      setError(result.error || 'Google sign in failed');
    }
    
    setLoading(false);
  };

  const handleGoogleError = (error: string) => {
    setError(error);
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
        
        {/* Enhanced error styling */}
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
          className="w-full bg-dhani-dark border pixel-corners border-dhani-gold/30 py-2 px-3 text-dhani-text font-robert focus:outline-none focus:ring-1 focus:ring-dhani-gold"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
          className="w-full bg-dhani-dark border rounded-2xl border-dhani-gold/30 py-2 px-3 text-dhani-text font-robert focus:outline-none focus:ring-1 focus:ring-dhani-gold"
        />        <PixelButton type="submit" disabled={loading} className="w-full">
          {loading ? 'Signing In...' : 'Sign In'}
        </PixelButton>
        
        <div className="flex items-center justify-center my-4">
          <div className="border-t border-dhani-gold/30 flex-grow"></div>
          <span className="px-3 text-dhani-text/70 text-sm font-robert">or</span>
          <div className="border-t border-dhani-gold/30 flex-grow"></div>
        </div>
        
        <GoogleSignInButton
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
          disabled={loading}
        />        <p className="text-center text-dhani-text/70 text-sm font-robert">
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