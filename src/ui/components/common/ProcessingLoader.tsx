import React, { useState, useEffect } from 'react';

interface ProcessingLoaderProps {
  text?: string;
  className?: string;
}

const ProcessingLoader: React.FC<ProcessingLoaderProps> = ({
  text = "Processing Details",
  className = ""
}) => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === '') return '.';
        if (prev === '.') return '..';
        if (prev === '..') return '...';
        return '';
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className="text-dhani-gold text-xl font-bold mb-4" style={{ fontFamily: 'VCR OSD Mono, monospace' }}>
        {text}
      </div>
      <div className="flex items-center space-x-1">
        <div 
          className="w-3 h-3 bg-dhani-gold rounded-full opacity-60"
          style={{
            animation: dots.length >= 1 ? 'pulse 0.5s ease-in-out' : 'none',
            opacity: dots.length >= 1 ? 1 : 0.3
          }}
        />
        <div 
          className="w-3 h-3 bg-dhani-gold rounded-full opacity-60"
          style={{
            animation: dots.length >= 2 ? 'pulse 0.5s ease-in-out 0.1s' : 'none',
            opacity: dots.length >= 2 ? 1 : 0.3
          }}
        />
        <div 
          className="w-3 h-3 bg-dhani-gold rounded-full opacity-60"
          style={{
            animation: dots.length >= 3 ? 'pulse 0.5s ease-in-out 0.2s' : 'none',
            opacity: dots.length >= 3 ? 1 : 0.3
          }}
        />
      </div>
    </div>
  );
};

export default ProcessingLoader;
