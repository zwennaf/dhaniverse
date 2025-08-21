import React from 'react';
import { animate } from 'motion';
import { useEffect, useRef, useState } from 'react';

interface NumberCounterProps {
  value: number;
  duration?: number;
  className?: string;
  style?: React.CSSProperties;
}

const NumberCounter: React.FC<NumberCounterProps> = ({ 
  value, 
  duration = 0.8, 
  className = '',
  style = {}
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentValue, setCurrentValue] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Inject CSS animation for the glow effect
    const styleEl = document.createElement('style');
    styleEl.id = 'number-counter-animations';
    if (!document.getElementById('number-counter-animations')) {
      styleEl.innerHTML = `
        @keyframes slide-glow {
          0% { opacity: 0; transform: translateY(100%); }
          50% { opacity: 1; transform: translateY(0%); }
          100% { opacity: 0; transform: translateY(-100%); }
        }
      `;
      document.head.appendChild(styleEl);
    }

    return () => {
      const existing = document.getElementById('number-counter-animations');
      if (existing && document.querySelectorAll('[data-number-counter]').length <= 1) {
        existing.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (currentValue === value) return;

    // For small increments (like continuous counting), use immediate update
    const diff = Math.abs(value - currentValue);
    if (diff === 1) {
      setCurrentValue(value);
      return;
    }

    setIsAnimating(true);
    
    const controls = animate(currentValue, value, {
      duration: Math.min(duration, diff * 0.1), // Shorter duration for small changes
      ease: "easeOut",
      onUpdate: (latest) => {
        setCurrentValue(Math.round(latest));
      },
      onComplete: () => {
        setCurrentValue(value);
        setIsAnimating(false);
      }
    });

    return () => controls.stop();
  }, [value, duration, currentValue]);

  // Create digit components that slide
  const renderDigit = (digit: number, position: number) => {
    return (
      <div 
        key={position}
        className="relative inline-block overflow-hidden"
        style={{ 
          height: '1em',
          width: '0.7em',
        }}
      >
        <div
          className="absolute transition-transform ease-out"
          style={{
            transform: `translateY(-${digit * 10}%)`,
            height: '1000%', // 10 digits * 100%
            transitionDuration: isAnimating ? '400ms' : '200ms',
            transitionTimingFunction: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)', // More cinematic easing
          }}
        >
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <div
              key={num}
              className="flex items-center justify-center"
              style={{ 
                height: '10%',
                transform: isAnimating ? 'scale(1.02)' : 'scale(1)', // Slight scale effect
                transition: 'transform 200ms ease-out'
              }}
            >
              {num}
            </div>
          ))}
        </div>
        
        {/* Add a subtle glow effect while animating */}
        {isAnimating && (
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%)',
              animation: 'slide-glow 400ms ease-out'
            }}
          />
        )}
      </div>
    );
  };

  // Convert number to array of digits
  const getDigits = (num: number) => {
    const str = num.toString().padStart(3, '0'); // Ensure at least 3 digits for 000-100
    return str.split('').map(Number);
  };

  const digits = getDigits(currentValue);

  return (
    <div 
      ref={containerRef}
      data-number-counter
      className={`inline-flex items-center ${className}`}
      style={{
        ...style,
        fontVariantNumeric: 'tabular-nums', // Ensures consistent digit width
      }}
    >
      {digits.map((digit, index) => renderDigit(digit, index))}
    </div>
  );
};

export default NumberCounter;
