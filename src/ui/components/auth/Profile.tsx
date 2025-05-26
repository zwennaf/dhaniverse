import React, { useState, useEffect } from 'react';
import { useUser, useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import PixelButton from '../atoms/PixelButton';
import { ArrowLeft } from 'lucide-react';

const Profile: React.FC = () => {
  const { user, isLoaded } = useUser();
  const { signOut, updateProfile } = useAuth();
  const navigate = useNavigate();  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasUserTyped, setHasUserTyped] = useState(false); // Track if user has manually typed

  useEffect(() => {
    if (!isLoaded || !user || hasUserTyped) return; // Don't override if user has typed
    console.log('Profile: User data:', user); // Debug log
    console.log('Profile: gameUsername value:', user.gameUsername); // Debug log
    console.log('Profile: gameUsername type:', typeof user.gameUsername); // Debug log
    // Prefill the input with existing game username, ensure it's a string
    setUsername(user.gameUsername || '');
  }, [isLoaded, user, hasUserTyped]);

  // Clear error on username change
  useEffect(() => {
    if (error) setError('');
  }, [username]);

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
  }  const handleSave = async () => {
    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      const result = await updateProfile(username.trim());
      if (result.success) {
        setSaved(true);
        setHasUserTyped(false); // Reset the flag after successful save
      } else {
        setError(result.error || 'Failed to save username');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save username');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayNow = () => {
    // Clear previous errors
    setError('');
    
    // Validate username
    if (!username || username.trim().length < 3) {
      setError('⚠️ Please set a valid username (at least 3 characters) before playing');
      setSaved(false);
      return;
    }
      // Username is valid, check if it needs saving
    if (!saved && username.trim() !== (user.gameUsername || '')) {
      // Try to save the username first, then navigate in the handleSave success path
      handleSave().then(() => {
        navigate('/game');
      });
    } else {
      // Username is already saved, navigate directly
      navigate('/game');
    }
  };

  // Handle Enter key press for better UX
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
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
        <p className="text-dhani-text/70 text-sm">Email: <span className="text-dhani-text font-robert">{user.email || 'N/A'}</span></p>
        
        {/* Make error more visible with padding and border */}
        {error && (
          <div className="text-red-400 text-sm font-tickerbit p-2 mb-2 border border-red-400 rounded bg-red-900/20">
            {error}
          </div>
        )}
        
        {saved && !error && (
          <div className="text-green-400 text-sm font-tickerbit p-2 mb-2 border border-green-400 rounded bg-green-900/20">
            Profile saved!
          </div>
        )}
          <label className="block text-dhani-text font-robert text-sm">In-Game Username</label>        <input
          type="text"
          value={username}
          onChange={(e) => { 
            console.log('Input onChange triggered:', e.target.value); // Debug log
            setUsername(e.target.value); 
            setHasUserTyped(true); // Mark that user has typed
            setSaved(false); 
          }}
          onKeyDown={handleKeyDown}
          placeholder="Your Game Username"
          disabled={loading}
          className={`w-full bg-dhani-dark border rounded-2xl py-2 px-3 text-dhani-text font-robert focus:outline-none focus:ring-1 focus:ring-dhani-gold ${!username || username.trim().length < 3 ? 'border-red-400' : 'border-dhani-gold/30'}`}
        />
        <div className="flex flex-col sm:flex-row gap-3">
          <PixelButton 
            variant='outline' 
            size='lg' 
            onClick={handlePlayNow} 
            disabled={loading} 
            className="sm:w-1/3 bg-transparent/50"
          >
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