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
    <div className={cn(" flex flex-col min-h-[150px] h-full", className)}>
        <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center mb-4 rounded-full text-dhani-gold">
          {userIcon}
        </div>
      <div className="flex-1">
        <p className="text-md font-vcr text-dhani-text leading-relaxed mb-2">"{quote}"</p>
      </div>
      <div className="flex items-center gap-2 mt-auto">
        <p className="text-lg text-dhani-text">— {author}</p>
      </div>
    </div>
  );
};

export default TestimonialCard;
