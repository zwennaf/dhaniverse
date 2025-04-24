
import React from 'react';
import { cn } from '../lib/utils';

interface PixelButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'cta' | 'signout';
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
        "pixel-corners hover:bg-dhani-gold/25",
        {
          'bg-dhani-gold text-black': variant === 'default',
          'bg-dhani-gold text-dhani-gold hover:bg-dhani-gold/10 px-6 py-2': variant === 'outline',
          'bg-dhani-gold/40 text-white pixel-corners-cta font-tickerbit hover:border-transparent text-lg px-8 py-3': variant === 'cta',
          'bg-red-500/40 text-white pixel-corners-cta font-tickerbit hover:border-transparent text-lg px-8 py-3': variant === 'signout',
          'text-xs px-4 py-1.5': size === 'sm',
          'bg-dhani-gold/95 pixel-corners-cta font-tickerbit hover:border-transparent text-lg px-8 py-3': size === 'lg',
          'text-lg px-8 py-3': size === 'default',
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
