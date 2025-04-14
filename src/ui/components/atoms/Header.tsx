
import React from 'react';
import PixelButton from './PixelButton';
import { cn } from '../lib/utils';
import CoinIcon from '../icons/CoinIcon';
import { Link } from 'react-router-dom';

interface HeaderProps {
  className?: string;
}

const Header = ({ className }: HeaderProps) => {
  return (
    <header className={cn("flex items-center justify-between py-3 px-4 bg-dhani-navbg backdrop-blur-sm nav-corners border-dhani-navbg", className)}>
      <Link to="/" className="flex gap-4 items-center">
        <CoinIcon className="h-6 w-6 mr-2 text-dhani-gold" />
        <span className="font-vcr text-white text-2xl">Dhaniverse</span>
      </Link>
      <PixelButton className="hover:bg-dhani-gold/50"><Link to="/game">Play Now</Link></PixelButton>
    </header>
  );
};

export default Header;
