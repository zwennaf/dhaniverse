import React, { useState } from 'react';
import { useSignIn } from '@clerk/clerk-react';
import { useNavigate, Link } from 'react-router-dom';
import PixelButton from '../atoms/PixelButton';

const CustomSignIn: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, setActive } = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!signIn || !setActive) {
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

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-gray-900 p-6 rounded-md shadow-md w-full max-w-md space-y-4">
        <h1 className="text-3xl font-vcr text-yellow-400 text-center">Sign In to Dhaniverse</h1>
        {error && <div className="text-red-500 text-sm">{error}</div>}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
          className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
        />
        <PixelButton type="submit" disabled={loading} className="w-full">
          {loading ? 'Signing In...' : 'Sign In'}
        </PixelButton>
        <PixelButton type="button" disabled={loading} className="w-full bg-blue-700 hover:bg-blue-800 text-white">
          <span onClick={async () => {
            setError(''); setLoading(true);
            try {
              await signIn.authenticateWithRedirect({
                strategy: 'oauth_google', 
                redirectUrl: window.location.origin + '/sign-in',
                redirectUrlComplete: window.location.origin + '/profile'
              });
            } catch (e) {
              setError('Google sign in failed');
            } finally { setLoading(false); }
          }}>
            Continue with Google
          </span>
        </PixelButton>
        <p className="text-center text-gray-400 text-sm">
          Don't have an account?{' '}
          <Link to="/sign-up" className="text-yellow-400 hover:underline">
            Sign Up
          </Link>
        </p>
      </form>
    </div>
  );
};

export default CustomSignIn;