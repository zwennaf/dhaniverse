import React from 'react';
import { ErrorFallbackProps } from './types';

interface MinimalErrorFallbackProps extends ErrorFallbackProps {
  message?: string;
  showRetry?: boolean;
}

/**
 * MinimalErrorFallback - Simple fallback component for non-critical component failures
 * 
 * Features:
 * - Minimal visual footprint to avoid disrupting user experience
 * - Optional retry functionality
 * - Accessible design with proper ARIA labels
 * - Keyboard navigation support
 * - Customizable error message
 */
export const MinimalErrorFallback: React.FC<MinimalErrorFallbackProps> = ({
  error,
  retry,
  canRetry,
  retryCount,
  resetError,
  message = "Something went wrong",
  showRetry = true,
}) => {
  const handleKeyDown = (event: React.KeyboardEvent, action: () => void) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className="minimal-error-fallback"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 12px',
        backgroundColor: '#fff3cd',
        border: '1px solid #ffeaa7',
        borderRadius: '4px',
        fontSize: '14px',
        color: '#856404',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        maxWidth: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Error icon */}
      <span
        aria-hidden="true"
        style={{
          fontSize: '16px',
          lineHeight: '1',
          flexShrink: 0,
        }}
      >
        ⚠️
      </span>

      {/* Error message */}
      <span
        style={{
          flex: '1',
          minWidth: '0',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {message}
      </span>

      {/* Action buttons */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          flexShrink: 0,
        }}
      >
        {showRetry && canRetry && (
          <button
            onClick={retry}
            onKeyDown={(e) => handleKeyDown(e, retry)}
            aria-label={`Retry loading component (attempt ${retryCount + 1})`}
            title={`Retry (${retryCount} attempts made)`}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              lineHeight: '1.2',
              transition: 'background-color 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#0056b3';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#007bff';
            }}
            onFocus={(e) => {
              e.currentTarget.style.outline = '2px solid #0056b3';
              e.currentTarget.style.outlineOffset = '1px';
            }}
            onBlur={(e) => {
              e.currentTarget.style.outline = 'none';
            }}
          >
            Retry
          </button>
        )}

        <button
          onClick={resetError}
          onKeyDown={(e) => handleKeyDown(e, resetError)}
          aria-label="Dismiss error and reset component"
          title="Dismiss error"
          style={{
            padding: '4px 8px',
            fontSize: '12px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer',
            lineHeight: '1.2',
            transition: 'background-color 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#545b62';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#6c757d';
          }}
          onFocus={(e) => {
            e.currentTarget.style.outline = '2px solid #545b62';
            e.currentTarget.style.outlineOffset = '1px';
          }}
          onBlur={(e) => {
            e.currentTarget.style.outline = 'none';
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
};