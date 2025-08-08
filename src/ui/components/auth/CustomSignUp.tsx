import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import PixelButton from '../atoms/PixelButton';
import GoogleSignInButton from './GoogleSignInButton';
import SEO from '../SEO';

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
  const { signUp, signInWithGoogle, isLoaded } = useAuth();
  
  // Always declare all hooks at the top level, before any conditional logic
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [gameUsername, setGameUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isLoaded) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center">
      <div className="text-white mb-4">Loading authentication...</div>
      <div className="w-16 h-16 border-t-4 border-dhani-gold border-solid rounded-full animate-spin"></div>
    </div>
  );
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await signUp(email, password, gameUsername);
    if (result.success) {
      navigate('/profile');
    } else {
      setError(result.error || 'Sign up failed');
    }
    setLoading(false);
  };
  const handleGoogleSuccess = async (googleToken: string) => {
    setLoading(true);
    setError('');
    
    const result = await signInWithGoogle(googleToken);
    
    if (result.success) {
      navigate('/profile');
    } else {
      setError(result.error || 'Google sign up failed');
    }
    
    setLoading(false);
  };

  const handleGoogleError = (error: string) => {
    setError(error);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <SEO 
        title="Join Dhaniverse - Free Financial Education Through Gaming"
        description="Create your free Dhaniverse account and start learning financial literacy through gaming. Join thousands of users mastering money management skills through our interactive RPG platform."
        keywords="join dhaniverse, dhaniverse signup, dhaniverse sign up, dhaniverse registration, financial education signup, money management game registration, financial literacy platform signup, free financial education, dhaniverse account, create dhaniverse account, financial game signup, money RPG registration, financial learning platform signup"
        url="https://dhaniverse.in/sign-up"
      />
      <div 
        className="absolute inset-0 z-0" 
        style={{
          backgroundImage: `url('/UI/bg.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(8px)'
        }}
      />
      <form onSubmit={handleSubmit} className="bg-black/70 p-6 rounded-lg w-full max-w-lg space-y-4 z-10">
        <h1 className="text-3xl font-tickerbit tracking-widest text-dhani-text text-center mb-4">Sign Up for <span className='text-dhani-gold pixel-glow'>Dhaniverse</span></h1>
        
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
          className="w-full bg-dhani-dark border border-dhani-text/30 rounded-2xl py-3 px-4 text-dhani-text font-robert focus:outline-none focus:ring-1 focus:ring-dhani-text/50"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
          className="w-full bg-dhani-dark border border-dhani-text/30 rounded-2xl py-3 px-4 text-dhani-text font-robert focus:outline-none focus:ring-1 focus:ring-dhani-text/50"
        />
        <input
          type="text"
          value={gameUsername}
          onChange={(e) => setGameUsername(e.target.value)}
          placeholder="In-Game Username"
          required
          className={`w-full bg-dhani-dark border rounded-2xl py-3 px-4 text-dhani-text font-robert focus:outline-none focus:ring-1 focus:ring-dhani-text/50 ${!gameUsername || gameUsername.trim().length < 3 ? 'border-red-400' : 'border-dhani-text/30'}`}
        />        <PixelButton type="submit" disabled={loading} className="w-full">
          {loading ? 'Signing Up...' : 'Sign Up'}
        </PixelButton>
        <div className="relative my-4 flex items-center justify-center">
          <div className="border-t border-dhani-gold/30 w-full"></div>
          <span className="bg-black/70 px-3 text-sm text-dhani-text/60">or</span>
          <div className="border-t border-dhani-gold/30 w-full"></div>
        </div>
        
        <GoogleSignInButton
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
          text="Sign up with Google"
          disabled={loading}
        />
        
        <p className="text-center text-dhani-text/70 text-sm font-robert">
          Already have an account?{' '}
          <Link to="/sign-in" className="text-dhani-gold hover:underline hover:text-dhani-gold/80">
            Sign In
          </Link>
        </p>
      </form>
    </div>
  );
};

export default CustomSignUp;