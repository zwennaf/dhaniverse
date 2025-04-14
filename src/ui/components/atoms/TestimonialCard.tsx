
import React from 'react';
import { cn } from '../lib/utils';

interface TestimonialCardProps {
  quote: string;
  author: string;
  userIcon: React.ReactNode;
  className?: string;
}

const TestimonialCard = ({ 
  quote, 
  author,
  userIcon,
  className 
}: TestimonialCardProps) => {
  return (
    <div className={cn("testimony-card", className)}>
      <div className="flex-1">
        <p className="text-xs font-vcr text-white leading-relaxed mb-4">"{quote}"</p>
      </div>
      <div className="flex items-center gap-2 mt-auto">
        <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-black/30 rounded-full text-dhani-gold">
          {userIcon}
        </div>
        <p className="text-xs text-dhani-gold">— {author}</p>
      </div>
    </div>
  );
};

export default TestimonialCard;
