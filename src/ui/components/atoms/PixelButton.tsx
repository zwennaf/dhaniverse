
import React from 'react';
import { cn } from '../lib/utils';

interface PixelButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
  children: React.ReactNode;
}

const PixelButton = ({ 
  variant = 'default', 
  size = 'default', 
  className, 
  children,
  ...props 
}: PixelButtonProps) => {
  return (
    <button
      className={cn(
        "relative font-tickerbit inline-flex items-center justify-center whitespace-nowrap",
        "transition-colors focus-visible:outline-none disabled:pointer-events-none",
        "pixel-corners",
        {
          'bg-dhani-gold text-black hover:bg-amber-400 px-6 py-2': variant === 'default',
          'bg-transparent border-2 border-dhani-gold text-dhani-gold hover:bg-dhani-gold/10 px-6 py-2': variant === 'outline',
          'text-xs px-4 py-1.5': size === 'sm',
          'text-lg font-tickerbit text-black font-bold px-8 py-3': size === 'lg',
          'text-sm px-6 py-2': size === 'default',
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

export default PixelButton;
