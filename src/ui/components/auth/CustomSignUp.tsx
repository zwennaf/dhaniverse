import React, { useState } from 'react';
import { useSignUp } from '@clerk/clerk-react';
import { useNavigate, Link } from 'react-router-dom';
import PixelButton from '../atoms/PixelButton';

const CustomSignUp: React.FC = () => {
  const navigate = useNavigate();
  const { signUp, setActive } = useSignUp();
  if (!signUp || !setActive) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // @ts-ignore allow publicMetadata
      const result = await signUp.create({ emailAddress: email, password, publicMetadata: { gameUsername } } as any);
      if (result.status === 'complete' && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        navigate('/profile');
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.longMessage || err.message || 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-gray-900 p-6 rounded-md shadow-md w-full max-w-md space-y-4">
        <h1 className="text-3xl font-vcr text-yellow-400 text-center">Sign Up for Dhaniverse</h1>
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
        <input
          type="text"
          value={gameUsername}
          onChange={(e) => setGameUsername(e.target.value)}
          placeholder="In-Game Username"
          required
          className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
        />
        <PixelButton type="submit" disabled={loading} className="w-full">
          {loading ? 'Signing Up...' : 'Sign Up'}
        </PixelButton>
        <p className="text-center text-gray-400 text-sm">
          Already have an account?{' '}
          <Link to="/sign-in" className="text-yellow-400 hover:underline">
            Sign In
          </Link>
        </p>
      </form>
    </div>
  );
};

export default CustomSignUp;