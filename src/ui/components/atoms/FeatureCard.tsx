
import React from 'react';
import { cn } from '../lib/utils';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  className?: string;
  iconBg?: string;
}

const FeatureCard = ({ 
  icon, 
  title, 
  description, 
  className,
}: FeatureCardProps) => {  return (    <div 
      className={cn("flex flex-row gap-2 sm:gap-3 md:gap-4 lg:gap-6 p-2 sm:p-3 md:p-4 lg:p-5 relative items-center", className)}
      style={{
        backgroundImage: `url("data:image/svg+xml;base64,${btoa(`<svg width="100%" height="100%" viewBox="0 0 400 120" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <path d="M385 3H391V6H395V10H398V110H395V114H391V117H385V118H15V117H9V114H5V110H3V10H5V6H9V3H15V0H385V3Z" fill="#373633"/>
        </svg>`)}")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        backgroundSize: '100% 100%',
        minHeight: '80px',
      }}>
      <div className="flex items-center justify-center flex-shrink-0">
        <div className="w-12 h-12 md:w-24 md:h-24 flex items-center justify-center">
          {icon}
        </div>
      </div>
      <div className="flex flex-col justify-center gap-4 lg:gap-6 flex-1">  
        <h3 className="text-xs sm:text-sm md:text-base lg:text-2xl font-vcr text-white leading-tight">{title}</h3>
        <p className="text-xs sm:text-xs md:text-sm lg:text-lg font-robert text-white/90 leading-relaxed">{description}</p>
      </div>
    </div>
  );
};

export default FeatureCard;
