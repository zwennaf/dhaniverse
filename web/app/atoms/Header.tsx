import React, { useEffect, useState } from 'react';
import PixelButton from './PixelButton';
import { cn } from '../lib/utils';
import CoinIcon from '../icons/CoinIcon';

interface HeaderProps { 
  className?: string;
  isSignedIn?: boolean;
  onProfile?: () => void;
  onSignOut?: () => void;
}

const Header = ({ className, isSignedIn = false, onProfile, onSignOut }: HeaderProps) => {
  const [introActive, setIntroActive] = useState(true);

  // Listen for earlier move start to overlap fade-in, and completion as fallback
  useEffect(() => {
    const moveStart = () => setIntroActive(false);
    const complete = () => setIntroActive(false);
    window.addEventListener('introAnimationMoveStart', moveStart, { once: true });
    window.addEventListener('introAnimationComplete', complete, { once: true });
    const fail = setTimeout(() => setIntroActive(false), 4500);
    return () => {
      window.removeEventListener('introAnimationMoveStart', moveStart);
      window.removeEventListener('introAnimationComplete', complete);
      clearTimeout(fail);
    };
  }, []);

  const handleSignOut = () => {
    // For simple auth, just clear localStorage and redirect
    if (typeof window !== 'undefined') {
      localStorage.removeItem('dhaniverse_token');
      window.location.href = 'https://dhaniverse.in/sign-in';
    }
    if (onSignOut) onSignOut();
  };

  return (
    <header
      className={cn(
        'max-w-screen-xl flex items-center justify-between py-4 px-4 nav-corners bg-dhani-navbg border-dhani-navbg transition-opacity duration-500',
        introActive ? 'opacity-0' : 'opacity-100',
        className
      )}
    >
      <div className={introActive ? 'invisible' : 'visible'}>
        <a href="/" data-brand-anchor className="flex gap-4 items-center">
          <CoinIcon className="h-6 w-6 mr-2 text-dhani-gold" />
          <span className="font-vcr text-dhani-text text-2xl sm:text-3xl lg:text-4xl">Dhaniverse</span>
        </a>
      </div>
      {isSignedIn ? (
        <div className={cn('flex gap-3 transition-opacity duration-300', introActive ? 'opacity-0 pointer-events-none' : 'opacity-100')}>
          <PixelButton size='lg' className="hover:bg-dhani-gold/50" onClick={() => window.location.href = 'https://dhaniverse.in/game'}>
            Play Now
          </PixelButton>
          <PixelButton variant="signout" className="hover:bg-red-400/70" onClick={handleSignOut}>
            Sign Out
          </PixelButton>
        </div>
      ) : (
        <PixelButton 
          size='lg' 
          className={cn('hover:bg-dhani-gold/50 transition-opacity duration-300', introActive ? 'opacity-0 pointer-events-none' : 'opacity-100')}
          onClick={() => window.location.href = 'https://dhaniverse.in/sign-in'}
        >
          Sign In
        </PixelButton>
      )}
    </header>
  );
};

export default Header;
