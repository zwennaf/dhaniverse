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
        <div className="text-dhani-text font-tickerbit z-10">Loading...</div>
      </div>
    );
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
      <div className="bg-dhani-darkgray p-6 rounded-2xl shadow-lg shadow-dhani-gold/20 w-full max-w-md space-y-4 z-10">
        <h1 className="text-3xl font-tickerbit tracking-widest uppercase text-dhani-text text-center">Set Your <span className='text-dhani-gold pixel-glow'>Username</span></h1>
        {error && <div className="text-red-400 text-sm font-tickerbit mb-4">{error}</div>}
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Your Game Username"
          className="w-full bg-dhani-dark border rounded-2xl border-dhani-gold/30 py-2 px-3 text-dhani-text font-robert focus:outline-none focus:ring-1 focus:ring-dhani-gold"
        />
        <div className="flex flex-col sm:flex-row gap-3">
          <PixelButton variant="outline" onClick={() => navigate('/')} disabled={loading} className="sm:w-1/3 border-dhani-gold/50">
            Back to Home
          </PixelButton>
          <PixelButton onClick={handleSave} disabled={loading} className="sm:w-2/3 bg-dhani-gold/90 hover:bg-dhani-gold text-dhani-darker">
            {loading ? 'Saving...' : 'Save and Play'}
          </PixelButton>
        </div>
      </div>
    </div>
  );
};

export default Profile;