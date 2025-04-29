import React, { useState, useEffect } from 'react';
import { useUser, useClerk } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import PixelButton from '../atoms/PixelButton';
import { ArrowLeft } from 'lucide-react';

const Profile: React.FC = () => {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isLoaded || !user) return;
    // Prefill the input with existing game username
    const existing = (user.unsafeMetadata?.gameUsername as string) ?? '';
    setUsername(existing);
  }, [isLoaded, user]);

  const handleOnClick = () => {
    navigate('/');
  }

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
      await user.update({ unsafeMetadata: { gameUsername: username.trim() }});
      setSaved(true);
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
        <h1 className="text-3xl font-tickerbit tracking-widest uppercase text-dhani-text text-center"><ArrowLeft className='absolute hover:cursor-pointer translate-y-1 hover:opacity-50 transition-opacity' onClick={handleOnClick} />Your <span className='text-dhani-gold pixel-glow'>Profile</span></h1>
        <p className="text-dhani-text/70 text-sm">Email: <span className="text-dhani-text font-robert">{user.primaryEmailAddress?.emailAddress || 'N/A'}</span></p>
        {error && <div className="text-red-400 text-sm font-tickerbit mb-2">{error}</div>}
        {saved && <div className="text-green-400 text-sm font-tickerbit mb-2">Profile saved!</div>}
        <label className="block text-dhani-text font-robert text-sm">In-Game Username</label>
        <input
          type="text"
          value={username}
          onChange={(e) => { setUsername(e.target.value); setSaved(false); }}
          placeholder="Your Game Username"
          className="w-full bg-dhani-dark border rounded-2xl border-dhani-gold/30 py-2 px-3 text-dhani-text font-robert focus:outline-none focus:ring-1 focus:ring-dhani-gold"
        />
        <div className="flex flex-col sm:flex-row gap-3">
          <PixelButton variant='outline' size='lg' onClick={() => navigate('/game')} disabled={loading} className="sm:w-1/3 bg-transparent/50 ">
            Play Now
          </PixelButton>
          <PixelButton variant='outline' size='lg' onClick={handleSave} disabled={loading} className="sm:w-1/3 bg-dhani-green/80 hover:bg-dhani-green/50 text-dhani-text">
            {loading ? 'Saving...' : 'Save'}
          </PixelButton>
          <PixelButton variant="signout" onClick={() => signOut().then(() => navigate('/sign-in'))} disabled={loading} className="sm:w-1/3 bg-red-600 hover:bg-red-900">
            Sign Out
          </PixelButton>
        </div>
      </div>
    </div>
  );
};

export default Profile;