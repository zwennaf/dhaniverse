import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import PixelButton from '../atoms/PixelButton';

const Profile: React.FC = () => {
  const { user, isLoaded } = useUser();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoaded || !user) return;
    
    // Check if user already has a game username
    const existing = user.unsafeMetadata?.gameUsername;
    if (existing) {
      navigate('/game');
    }
  }, [isLoaded, user, navigate]);

  if (!isLoaded || !user) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>;
  }

  const handleSave = async () => {
    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      // Use unsafeMetadata instead of publicMetadata
      await user.update({
        unsafeMetadata: { 
          gameUsername: username.trim() 
        }
      });
      
      navigate('/game');
    } catch (err: any) {
      setError(err.message || 'Failed to save username');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="bg-gray-900 p-6 rounded-md shadow-md w-full max-w-md space-y-4">
        <h1 className="text-3xl font-vcr text-yellow-400 text-center">Set Your In-Game Username</h1>
        {error && <div className="text-red-500 text-sm mb-4">{error}</div>}
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Your Game Username"
          className="w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
        />
        <PixelButton onClick={handleSave} disabled={loading} className="w-full">
          {loading ? 'Saving...' : 'Save and Continue'}
        </PixelButton>
      </div>
    </div>
  );
};

export default Profile;