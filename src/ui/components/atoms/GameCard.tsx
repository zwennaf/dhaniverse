
import React from 'react';
import { cn } from '../lib/utils';

interface GameCardProps {
  imageSrc: string;
  altText: string;
  className?: string;
}

const GameCard = ({ 
  imageSrc, 
  altText,
  className 
}: GameCardProps) => {
  return (
    <div className={cn("game-building-card", className)}>
      <div className="relative group cursor-pointer">
        <img 
          src={imageSrc} 
          alt={altText} 
          className="w-full h-auto object-cover transform transition-transform duration-300 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/0 to-black/50 group-hover:opacity-0 transition-opacity duration-300"></div>
        <div className="absolute inset-0 bg-dhani-gold/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      </div>
    </div>
  );
};

export default GameCard;
