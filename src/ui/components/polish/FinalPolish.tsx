import React, { useEffect, useState } from 'react';

// Final polish wrapper for banking components
interface BankingPolishProps {
  children: React.ReactNode;
  className?: string;
}

export const BankingPolish: React.FC<BankingPolishProps> = ({
  children,
  className = ''
}) => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Ensure all assets are loaded and animations are ready
    const timer = setTimeout(() => setIsReady(true), 150);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`
      font-vcr
      ${isReady ? 'animate-fade-in-up' : 'opacity-0 translate-y-4'}
      transition-all duration-500 ease-out
      ${className}
    `}>
      {children}
    </div>
  );
};

// Enhanced button with final polish
interface PolishedButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export const PolishedButton: React.FC<PolishedButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className = ''
}) => {
  const [isPressed, setIsPressed] = useState(false);

  const baseClasses = `
    font-vcr font-bold tracking-wider border-2 transition-all duration-200 ease-out
    transform-gpu will-change-transform
    focus:outline-none focus:ring-4 focus:ring-dhani-gold/50 focus:ring-offset-2 focus:ring-offset-black
    disabled:opacity-50 disabled:cursor-not-allowed
    hover:scale-105 active:scale-95
    relative overflow-hidden
  `;

  const variantClasses = {
    primary: 'bg-dhani-gold text-black border-dhani-gold hover:bg-dhani-gold/90 hover:shadow-lg hover:shadow-dhani-gold/20',
    secondary: 'bg-transparent text-dhani-gold border-dhani-gold hover:bg-dhani-gold/10 hover:shadow-lg hover:shadow-dhani-gold/10',
    success: 'bg-dhani-green text-white border-dhani-green hover:bg-dhani-green/90 hover:shadow-lg hover:shadow-dhani-green/20',
    danger: 'bg-red-500 text-white border-red-500 hover:bg-red-600 hover:shadow-lg hover:shadow-red-500/20'
  };

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm min-h-[40px]',
    md: 'px-4 py-3 text-base min-h-[48px]',
    lg: 'px-6 py-4 text-lg min-h-[56px]'
  };

  return (
    <button
      onClick={onClick}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      disabled={disabled || loading}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {/* Shine effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-700 ease-out" />
      
      {/* Loading spinner */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-current border-t-transparent animate-spin" />
        </div>
      )}
      
      {/* Button content */}
      <span className={`relative z-10 ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}>
        {children}
      </span>
      
      {/* Press effect */}
      {isPressed && (
        <div className="absolute inset-0 bg-black/10" />
      )}
    </button>
  );
};

// Enhanced card with final polish
interface PolishedCardProps {
  children: React.ReactNode;
  variant?: 'default' | 'gold' | 'success' | 'error';
  hover?: boolean;
  glow?: boolean;
  className?: string;
}

export const PolishedCard: React.FC<PolishedCardProps> = ({
  children,
  variant = 'default',
  hover = true,
  glow = false,
  className = ''
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const baseClasses = `
    bg-black/80 border-2 p-4 transition-all duration-300 ease-out
    transform-gpu will-change-transform
    relative overflow-hidden
  `;

  const variantClasses = {
    default: 'border-white/20 hover:border-white/40',
    gold: 'border-dhani-gold bg-dhani-gold/10 hover:border-dhani-gold hover:bg-dhani-gold/20',
    success: 'border-dhani-green bg-dhani-green/10 hover:border-dhani-green hover:bg-dhani-green/20',
    error: 'border-red-500 bg-red-500/10 hover:border-red-500 hover:bg-red-500/20'
  };

  const hoverClasses = hover ? 'hover:scale-105 hover:shadow-xl' : '';
  const glowClasses = glow ? 'animate-pulse shadow-lg shadow-dhani-gold/20' : '';

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${hoverClasses} ${glowClasses} ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      
      {/* Hover glow effect */}
      {isHovered && hover && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-dhani-gold/5 to-transparent animate-pulse" />
      )}
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

// Enhanced input with final polish
interface PolishedInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  error?: string;
  success?: boolean;
  disabled?: boolean;
  className?: string;
}

export const PolishedInput: React.FC<PolishedInputProps> = ({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  error,
  success = false,
  disabled = false,
  className = ''
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const getBorderColor = () => {
    if (error) return 'border-red-500 focus:border-red-500 focus:ring-red-500/20';
    if (success) return 'border-dhani-green focus:border-dhani-green focus:ring-dhani-green/20';
    return 'border-white/20 focus:border-dhani-gold focus:ring-dhani-gold/20';
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-white text-sm font-vcr font-bold tracking-wider">
        {label.toUpperCase()}
      </label>
      
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            w-full bg-black text-white px-4 py-3 font-vcr border-2
            transition-all duration-200 ease-out min-h-[48px]
            focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-offset-black
            disabled:opacity-50 disabled:cursor-not-allowed
            ${getBorderColor()}
          `}
        />
        
        {/* Focus glow effect */}
        {isFocused && !error && (
          <div className="absolute inset-0 border-2 border-dhani-gold/50 pointer-events-none animate-pulse" />
        )}
        
        {/* Success indicator */}
        {success && !error && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-dhani-green">
            ✓
          </div>
        )}
        
        {/* Error indicator */}
        {error && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-red-500">
            ✕
          </div>
        )}
      </div>
      
      {error && (
        <p className="text-red-400 text-sm font-vcr animate-slide-in-up">
          {error}
        </p>
      )}
    </div>
  );
};

// Enhanced modal with final polish
interface PolishedModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export const PolishedModal: React.FC<PolishedModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md'
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Enhanced backdrop */}
      <div
        className={`
          absolute inset-0 bg-black/80 backdrop-blur-sm
          ${isAnimating ? 'animate-fade-in' : ''}
        `}
        onClick={onClose}
      />
      
      {/* Modal */}
      <div
        className={`
          relative w-full ${sizeClasses[size]} max-h-[90vh] 
          bg-black border-4 border-dhani-gold overflow-hidden
          shadow-2xl shadow-dhani-gold/20
          ${isAnimating ? 'animate-scale-in' : ''}
          transform-gpu
        `}
      >
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-dhani-gold/5 to-transparent pointer-events-none" />
        
        {/* Header */}
        <div className="relative flex items-center justify-between p-6 border-b-2 border-dhani-gold bg-dhani-gold/10">
          <h2 className="font-vcr font-bold text-xl text-dhani-gold tracking-wider">
            {title.toUpperCase()}
          </h2>
          <PolishedButton
            onClick={onClose}
            variant="secondary"
            size="sm"
            className="w-8 h-8 min-h-[32px] p-0 flex items-center justify-center"
          >
            ×
          </PolishedButton>
        </div>
        
        {/* Content */}
        <div className="relative p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {children}
        </div>
      </div>
    </div>
  );
};

// Final validation and testing component
interface ValidationWrapperProps {
  children: React.ReactNode;
  testId?: string;
}

export const ValidationWrapper: React.FC<ValidationWrapperProps> = ({
  children,
  testId
}) => {
  const [isValid, setIsValid] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    // Run validation checks
    const validateComponent = () => {
      const newErrors: string[] = [];
      
      // Check for accessibility issues
      const element = document.querySelector(`[data-testid="${testId}"]`);
      if (element) {
        const focusableElements = element.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        focusableElements.forEach((el) => {
          if (!el.getAttribute('aria-label') && !el.textContent?.trim()) {
            newErrors.push('Focusable element missing accessible label');
          }
        });
      }
      
      setErrors(newErrors);
      setIsValid(newErrors.length === 0);
    };

    if (process.env.NODE_ENV === 'development') {
      validateComponent();
    }
  }, [testId]);

  return (
    <div data-testid={testId} className="relative">
      {children}
      
      {/* Development validation overlay */}
      {process.env.NODE_ENV === 'development' && !isValid && (
        <div className="absolute top-0 right-0 bg-red-900/90 text-red-200 p-2 text-xs font-vcr max-w-xs">
          <div className="font-bold mb-1">VALIDATION ERRORS:</div>
          <ul className="space-y-1">
            {errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};