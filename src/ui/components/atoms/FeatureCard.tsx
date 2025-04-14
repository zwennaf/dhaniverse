
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
  iconBg = "bg-dhani-lightgray"
}: FeatureCardProps) => {
  return (
    <div className={cn("flex gap-4 bg-dhani-lightgray p-4 pixel-corners", className)}>
      <div className={cn("flex-shrink-0 w-12 h-12 flex items-center justify-center", iconBg)}>
        {icon}
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-vcr text-dhani-gold">{title}</h3>
        <p className="text-xs font-vcr text-white/80 leading-relaxed">{description}</p>
      </div>
    </div>
  );
};

export default FeatureCard;
