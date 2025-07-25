import React from 'react';

export type StatusType = 'success' | 'error' | 'warning' | 'info' | 'loading';

interface StatusIndicatorProps {
  type: StatusType;
  size?: 'sm' | 'md' | 'lg';
  animate?: boolean;
  className?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  type,
  size = 'md',
  animate = true,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  const colorClasses = {
    success: 'bg-dhani-green',
    error: 'bg-red-500',
    warning: 'bg-dhani-gold',
    info: 'bg-blue-500',
    loading: 'bg-dhani-gold'
  };

  const animationClasses = {
    success: animate ? 'animate-pulse' : '',
    error: animate ? 'animate-pulse' : '',
    warning: animate ? 'animate-pulse' : '',
    info: animate ? 'animate-pulse' : '',
    loading: animate ? 'animate-spin' : ''
  };

  return (
    <div
      className={`
        ${sizeClasses[size]} 
        ${colorClasses[type]} 
        ${animationClasses[type]}
        ${type === 'loading' ? 'border-2 border-transparent border-t-dhani-gold rounded-full' : 'rounded-none'}
        ${className}
      `}
      style={{ imageRendering: 'pixelated' }}
    />
  );
};

interface StatusBadgeProps {
  type: StatusType;
  text: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  type,
  text,
  size = 'md',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  const colorClasses = {
    success: 'bg-dhani-green/20 border-dhani-green text-dhani-green',
    error: 'bg-red-500/20 border-red-500 text-red-400',
    warning: 'bg-dhani-gold/20 border-dhani-gold text-dhani-gold',
    info: 'bg-blue-500/20 border-blue-500 text-blue-400',
    loading: 'bg-dhani-gold/20 border-dhani-gold text-dhani-gold'
  };

  return (
    <div
      className={`
        inline-flex items-center space-x-2 
        border-2 font-vcr font-bold tracking-wider
        ${sizeClasses[size]}
        ${colorClasses[type]}
        ${className}
      `}
      style={{ imageRendering: 'pixelated' }}
    >
      <StatusIndicator type={type} size="sm" />
      <span>{text.toUpperCase()}</span>
    </div>
  );
};

interface ConnectionStatusProps {
  connected: boolean;
  walletType?: string;
  address?: string;
  className?: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  connected,
  walletType,
  address,
  className = ''
}) => {
  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <StatusIndicator 
        type={connected ? 'success' : 'error'} 
        size="md" 
        animate={!connected}
      />
      <div className="font-vcr">
        <div className="text-white text-sm font-bold tracking-wider">
          {connected ? 'CONNECTED' : 'DISCONNECTED'}
        </div>
        {connected && walletType && (
          <div className="text-dhani-gold text-xs tracking-wider">
            {walletType.toUpperCase()}
          </div>
        )}
        {connected && address && (
          <div className="text-gray-400 text-xs font-mono">
            {address.slice(0, 8)}...{address.slice(-6)}
          </div>
        )}
      </div>
    </div>
  );
};

interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  size = 'md',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  return (
    <div className={`flex items-center justify-center space-x-3 ${className}`}>
      <div className="relative">
        <div className="w-8 h-8 border-4 border-gray-600 border-t-dhani-gold animate-spin" 
             style={{ imageRendering: 'pixelated' }} />
        <div className="absolute inset-0 w-8 h-8 border-2 border-dhani-gold/30" 
             style={{ imageRendering: 'pixelated' }} />
      </div>
      <span className={`font-vcr font-bold tracking-wider text-dhani-gold ${sizeClasses[size]}`}>
        {message.toUpperCase()}
      </span>
    </div>
  );
};

interface ProgressBarProps {
  progress: number; // 0-100
  label?: string;
  showPercentage?: boolean;
  color?: 'gold' | 'green' | 'blue' | 'red';
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  label,
  showPercentage = true,
  color = 'gold',
  className = ''
}) => {
  const colorClasses = {
    gold: 'bg-dhani-gold',
    green: 'bg-dhani-green',
    blue: 'bg-blue-500',
    red: 'bg-red-500'
  };

  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div className={`w-full ${className}`}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {label && (
            <span className="font-vcr text-sm font-bold tracking-wider text-white">
              {label.toUpperCase()}
            </span>
          )}
          {showPercentage && (
            <span className="font-vcr text-sm font-bold tracking-wider text-dhani-gold">
              {Math.round(clampedProgress)}%
            </span>
          )}
        </div>
      )}
      <div className="w-full h-4 bg-gray-700 border-2 border-white/20" 
           style={{ imageRendering: 'pixelated' }}>
        <div
          className={`h-full ${colorClasses[color]} transition-all duration-500 ease-out`}
          style={{ 
            width: `${clampedProgress}%`,
            imageRendering: 'pixelated'
          }}
        />
      </div>
    </div>
  );
};