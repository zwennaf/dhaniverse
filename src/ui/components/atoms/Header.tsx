
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
    <header className={cn(" max-w-screen-xl flex items-center justify-between py-4 px-4 bg-dhani-navbg backdrop-blur-sm nav-corners border-dhani-navbg", className)}>
      <Link to="/" className="flex gap-4 items-center">
        <CoinIcon className="h-6 w-6 mr-2 text-dhani-gold" />
        <span className="font-vcr text-dhani-text text-2xl sm:text-3xl lg:text-4xl">Dhaniverse</span>
      </Link>
      <PixelButton size='lg' className="hover:bg-dhani-gold/50"><Link to="/game">Play now</Link></PixelButton>
    </header>
  );
};

export default Header;
