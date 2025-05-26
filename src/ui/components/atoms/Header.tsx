import React from 'react';
import PixelButton from './PixelButton';
import { cn } from '../lib/utils';
import CoinIcon from '../icons/CoinIcon';
import { Link } from 'react-router-dom';
import { useUser, useAuth } from '../../contexts/AuthContext';

interface HeaderProps {
  className?: string;
}

const Header = ({ className }: HeaderProps) => {
  const { isSignedIn } = useUser();
  const { signOut } = useAuth();
  
  const handleSignOut = async () => {
    await signOut();
    // Redirect to home after sign out
    window.location.href = '/';
  };
  
  return (
    <header className={cn(" max-w-screen-xl flex items-center justify-between py-4 px-4 bg-dhani-navbg backdrop-blur-sm nav-corners border-dhani-navbg", className)}>
      <Link to="/" className="flex gap-4 items-center">
        <CoinIcon className="h-6 w-6 mr-2 text-dhani-gold" />
        <span className="font-vcr text-dhani-text text-2xl sm:text-3xl lg:text-4xl">Dhaniverse</span>
      </Link>
      {isSignedIn ? (
        <div className="flex gap-3">
          <Link to="/game">
            <PixelButton size='lg' className="hover:bg-dhani-gold/50">
              Play Now
            </PixelButton>
            </Link>
          <PixelButton variant="signout" className="hover:bg-red-400/70" onClick={handleSignOut}>
            Sign Out
          </PixelButton>
        </div>
      ) : (
          <Link to="/sign-in">
            <PixelButton size='lg' className="hover:bg-dhani-gold/50">
              Sign In
            </PixelButton>
          </Link>
      )}
    </header>
  );
};

export default Header;
