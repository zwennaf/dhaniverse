import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useUser, useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import PixelButton from '../atoms/PixelButton';
import { ArrowLeft, PencilLine } from 'lucide-react';
import CoinIcon from '../icons/CoinIcon';

const Profile: React.FC = () => {
  const { user, isLoaded } = useUser();
  const { signOut, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [selectedCharacter, setSelectedCharacter] = useState(''); // No default selection
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [editing, setEditing] = useState(false);
  const prefilledOnce = useRef(false); // ensure we only prefill from user one time

  // Balance state (from BalanceManager)
  const [cashBalance, setCashBalance] = useState<number | null>(null);
  const [bankBalance, setBankBalance] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const isTypingRef = useRef(false);

  const characters = useMemo(
    () => [
      { id: 'C1', label: 'Soul', color: '#B2EEE6', preview: '/characters/C1-Preview.png', full: '/characters/C1.png' },
      { id: 'C2', label: 'Wheat', preview: '/characters/C2-Preview.png', full: '/characters/C2.png' },
      { id: 'C3', label: 'Lavender', preview: '/characters/C3-Preview.png', full: '/characters/C3.png' },
      { id: 'C4', label: 'Sea', preview: '/characters/C4-Preview.png', full: '/characters/C4.png' },
    ],
    []
  );

  useEffect(() => {
    if (!isLoaded || !user || prefilledOnce.current) return;
    // Prefill just once from user profile
    const preUser = (user as any) || {};
    setUsername(preUser.gameUsername || '');
    setSelectedCharacter(preUser.selectedCharacter || 'C1');
    prefilledOnce.current = true;
  }, [isLoaded, user]);

  // Subscribe to BalanceManager for live balances (best-effort)
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let mounted = true;
  (async () => {
      try {
    const { balanceManager } = await import('../../../services/BalanceManager');
        if (!mounted) return;
        const { cash, bankBalance } = balanceManager.getBalance();
        setCashBalance(cash);
        setBankBalance(bankBalance);
        unsubscribe = balanceManager.onBalanceChange?.((b: any) => {
          setCashBalance(b.cash);
          setBankBalance(b.bankBalance);
        });
      } catch (e) {
        // BalanceManager not available; ignore gracefully
      }
    })();
    return () => {
      mounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // No auto-step. The user explicitly advances by pressing Save (handled in handleSave).

  // Clear error on username change
  useEffect(() => {
    if (error) setError('');
  }, [username]);

  // Preserve focus while typing even if component re-renders
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    if (isTypingRef.current && document.activeElement !== el) {
      const pos = el.value.length;
      el.focus();
      try {
        el.setSelectionRange(pos, pos);
      } catch {}
    }
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
  }

  const handleSave = async (characterOverride?: string) => {
    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }
    
    const finalCharacter = characterOverride || selectedCharacter;

    if (!finalCharacter) {
      setError('Please select a character before saving');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      const result = await updateProfile(username.trim(), finalCharacter);
      if (result.success) {
        setSaved(true);
  setStep(2);
  setEditing(false);
  // saved successfully
      } else {
        setError(result.error || 'Failed to save profile');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayNow = () => {
    // Clear previous errors
    setError('');
    
    // Require explicit Save before playing
    if (!saved) {
      setError('Please save your profile first.');
      return;
    }

    // Optional: validate again to be safe
    if (!username || username.trim().length < 3 || !selectedCharacter) {
      setError('Profile incomplete. Enter a valid username and character, then save.');
      return;
    }

    navigate('/game');
  };

  // Do not auto-save on Enter; let users click Save to avoid blur/unfocus issues
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // keep focus and do nothing; Save is explicit
    }
  };

  // Shared header and progress bar
  const Progress = () => (
    <div className="-mt-6">
      <div className="flex gap-1 max-w-lg z-20 mx-auto justify-center w-[97%]">
        <div className={`h-4 flex-1 rounded-sm border border-dhani-dark bg-dhani-gold ${step >= 1 ? 'opacity-100' : 'opacity-30'}`}></div>
        <div className={`h-4 flex-1 rounded-sm border border-dhani-dark bg-dhani-gold ${step >= 2 ? 'opacity-100' : 'opacity-30'}`}></div>
      </div>
      <p className="mt-8 text-center text-xs font-robert text-dhani-text/70">
        {step === 1 ? '1 out of 2 is done' : 'You are good to go >>'}
      </p>
    </div>
  );

  const FooterBrand = () => (
    <div className="absolute bottom-6 inset-x-0 flex items-center justify-center gap-2 text-dhani-text/90">
      <CoinIcon size={36} className="drop-shadow" />
      <span className="font-vcr text-2xl">Dhaniverse</span>
    </div>
  );

  const StepOne = () => (
    <div className="bg-black/70 p-6 rounded-lg w-full max-w-lg space-y-4 z-20">
      <div className='flex justify-between items-center mb-12'>
        <div className='flex gap-2 items-center'>
          <ArrowLeft className='hover:cursor-pointer hover:opacity-50 transition-opacity' onClick={handleOnClick} />
          <h1 className="text-3xl font-tickerbit text-dhani-text text-center">
            Your Profile
          </h1>
        </div>
        <span className="text-dhani-text text-xs font-robert">{user.email || 'N/A'}</span>
      </div>

      {error && (
        <div className="text-red-400 text-sm font-tickerbit p-2 mb-2 border border-red-400 rounded bg-red-900/20">{error}</div>
      )}
      {saved && !error && (
        <div className="text-green-400 text-sm font-tickerbit p-2 mb-2 border border-green-400 rounded bg-green-900/20">Profile saved!</div>
      )}

      <div>
        <label className="block text-dhani-text font-tickerbit text-sm mb-2">Enter your username*</label>
        <input
          ref={inputRef}
          type="text"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            setSaved(false);
          }}
          onFocus={() => { isTypingRef.current = true; }}
          onBlur={() => { isTypingRef.current = false; }}
          onKeyDown={handleKeyDown}
          placeholder="Username here"
          disabled={loading}
          className={`w-full bg-dhani-dark border rounded-2xl py-3 px-4 text-dhani-text font-robert focus:outline-none focus:ring-1 focus:ring-dhani-text/50 ${!username || username.trim().length < 3 ? 'border-red-400' : 'border-dhani-text/30'}`}
        />
      </div>

      <div className="space-y-3">
        <label className="block text-dhani-text font-tickerbit text-sm">Pick your character Color*</label>
        <div className="grid grid-cols-4 gap-3 pb-8">
          {characters.map(({ id, label, preview }) => (
            <div key={id} className="flex flex-col items-center justify-center">
              <button
                type="button"
                key={id}
                onClick={() => {
                  setSelectedCharacter(id);
                  prefilledOnce.current = true; // prevent reverting to saved value after interaction
                  setSaved(false);
                }}
                disabled={loading}
                className={`group relative flex flex-col items-center justify-center rounded-xl border transition-all duration-200 focus:outline-none py-2 ${selectedCharacter === id ? 'border-dhani-green shadow-[0_0_0_2px_#269F3C] bg-dhani-dark/60' : 'border-white/20 hover:border-[#269F3C]/60 bg-dhani-dark/40'}`}
                >
                <img
                  src={preview}
                  alt={`Character ${label}`}
                  className="w-20 h-20 object-cover scale-150"
                  style={{ imageRendering: 'pixelated' }}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = `/characters/${id}.png`; }}
                  />
              </button>
              <p className={`text-sm mt-2 font-robert ${selectedCharacter === id ? 'text-dhani-green' : 'text-dhani-text'}`}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between pb-4">
        <PixelButton 
          variant='outline' 
          size='lg' 
          onClick={() => handleSave()} 
          disabled={loading}
          className="sm:w-1/3 bg-dhani-green/80 hover:bg-dhani-green/50 text-dhani-text"
        >
          {loading ? 'Saving...' : 'Save'}
        </PixelButton>
        <PixelButton variant="signout" onClick={() => signOut().then(() => navigate('/sign-in'))} disabled={loading} className="sm:w-1/3 bg-red-600 hover:bg-red-900">
          Sign Out
        </PixelButton>
      </div>
    </div>
  );

  const StepTwo = () => {
    const sel = characters.find(c => c.id === selectedCharacter) || characters[0];
    const displayName = username ? `@${username}` : '@player';
    return (
      <div className="bg-black/70 p-8 rounded-2xl w-full max-w-lg space-y-4 z-20 relative">
        <div className='flex justify-between items-center mb-12'>
          <div className='flex gap-4 items-center'>
            <ArrowLeft className='hover:cursor-pointer hover:opacity-50 transition-opacity' onClick={handleOnClick} />
            <h1 className="text-3xl font-tickerbit text-dhani-text text-center">
              Your Profile
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4 pb-8">
          <div className="shrink-0 rounded-xl border border-white/20 bg-dhani-dark/60 p-2">
            <img src={sel.preview} alt={sel.label} className="w-20 h-20 object-cover scale-150" style={{ imageRendering: 'pixelated' }} onError={(e) => { (e.currentTarget as HTMLImageElement).src = sel.full; }} />
          </div>
          <div className="flex-1">
            <div className='flex justify-between items-center'>
              <div className="text-xl font-tickerbit text-dhani-text">{displayName}</div>
              <button
                type="button"
                onClick={() => { setEditing(true); setSaved(false); setStep(1); }}
                aria-label="Edit profile"
                className=" p-1.5 rounded-lg border border-white/20 hover:border-white/60 bg-black/30"
                >
                <PencilLine size={16} className="text-dhani-text" />
              </button>
            </div>
            <div className="text-dhani-text/70 text-sm font-robert">{user.email || 'N/A'}</div>
            {cashBalance !== null && (
              <div className="text-dhani-gold font-tickerbit text-xl mt-1 flex items-center gap-1 tracking-wide">
                <CoinIcon size={24} />
                {cashBalance.toLocaleString()}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between pb-4">
          <PixelButton variant="signout" onClick={() => signOut().then(() => navigate('/sign-in'))} disabled={loading} className="sm:w-1/3 bg-red-600 hover:bg-red-900">
            Sign Out
          </PixelButton>
          <PixelButton 
            variant='cta' 
            size='lg' 
            onClick={handlePlayNow} 
            disabled={loading} 
            className="sm:w-1/3 text-black hover:bg-dhani-green hover:text-dhani-text"
          >
            Play Now →
          </PixelButton>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      <div 
        className="absolute inset-0 z-0" 
        style={{
          backgroundImage: `url('/UI/bg.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(8px)'
        }}
      />
      <div className="w-full text-center z-10 pointer-events-none mb-4">
        <h2 className="text-4xl font-tickerbit tracking-widest text-dhani-text/95">Almost Their</h2>
      </div>
        
      {step === 1 ? <StepOne /> : <StepTwo />}

      <div className="w-11/12 max-w-lg z-20 mx-auto">
        <Progress />
      </div>

      <FooterBrand />
    </div>
  );
};

export default Profile;