import React, { useState } from 'react';
import { useSignUp } from '@clerk/clerk-react';
import { useNavigate, Link } from 'react-router-dom';
import PixelButton from '../atoms/PixelButton';

const CustomSignUp: React.FC = () => {
  const navigate = useNavigate();
  const { signUp, setActive, isLoaded } = useSignUp();
  if (!signUp || !setActive) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading authentication...</div>
      </div>
    );
  }
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading authentication...</div>
      </div>
    );
  }
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [gameUsername, setGameUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');

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
  
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await signUp.attemptEmailAddressVerification({ code: verificationCode });
      if (result.status === 'complete' && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
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
        {error && <div className="text-red-400 text-sm font-tickerbit">{error}</div>}
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
          className="w-full bg-dhani-dark border rounded-2xl border-dhani-gold/30 py-2 px-3 text-dhani-text font-robert focus:outline-none focus:ring-1 focus:ring-dhani-gold"
        />
        <PixelButton type="submit" disabled={loading} className="w-full">
          {loading ? 'Signing Up...' : 'Sign Up'}
        </PixelButton>
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
        {error && <div className="text-red-400 text-sm">{error}</div>}
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