import React, { useState } from 'react';
import { ErrorFallbackProps } from './types';

interface CustomAction {
  label: string;
  action: () => void;
  variant?: 'primary' | 'secondary';
}

interface DetailedErrorFallbackProps extends ErrorFallbackProps {
  title?: string;
  description?: string;
  supportContact?: string;
  showErrorDetails?: boolean;
  customActions?: CustomAction[];
}

/**
 * DetailedErrorFallback - Comprehensive fallback component for critical component failures
 * 
 * Features:
 * - Detailed error information display
 * - Expandable error details for debugging
 * - Multiple action buttons with custom actions support
 * - Loading states for retry operations
 * - Accessible design with proper ARIA labels and keyboard navigation
 * - Support contact information
 * - Retry count display with progress indication
 */
export const DetailedErrorFallback: React.FC<DetailedErrorFallbackProps> = ({
  error,
  errorInfo,
  retry,
  canRetry,
  retryCount,
  resetError,
  title = "Oops! Something went wrong",
  description = "We encountered an unexpected error. Please try again or contact support if the problem persists.",
  supportContact,
  showErrorDetails = process.env.NODE_ENV === 'development',
  customActions = [],
}) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500)); // Brief delay for UX
      retry();
    } finally {
      setIsRetrying(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent, action: () => void) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      action();
    }
  };

  const toggleDetails = () => {
    setShowDetails(!showDetails);
  };

  const getButtonStyle = (variant: 'primary' | 'secondary' = 'primary', disabled = false) => ({
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: '500',
    border: 'none',
    borderRadius: '6px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s ease',
    opacity: disabled ? 0.6 : 1,
    backgroundColor: variant === 'primary' ? '#007bff' : '#6c757d',
    color: 'white',
    minWidth: '100px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  });

  const maxRetries = 3; // This should ideally come from props or config
  const retryProgress = Math.min((retryCount / maxRetries) * 100, 100);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="detailed-error-fallback"
      style={{
        maxWidth: '600px',
        margin: '20px auto',
        padding: '32px',
        backgroundColor: '#ffffff',
        border: '1px solid #e9ecef',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#333',
        textAlign: 'center',
      }}
    >
      {/* Error Icon */}
      <div
        style={{
          fontSize: '48px',
          marginBottom: '16px',
        }}
        aria-hidden="true"
      >
        🚨
      </div>

      {/* Title */}
      <h2
        style={{
          fontSize: '24px',
          fontWeight: '600',
          margin: '0 0 16px 0',
          color: '#dc3545',
        }}
      >
        {title}
      </h2>

      {/* Description */}
      <p
        style={{
          fontSize: '16px',
          lineHeight: '1.5',
          margin: '0 0 24px 0',
          color: '#6c757d',
        }}
      >
        {description}
      </p>

      {/* Retry Progress Indicator */}
      {retryCount > 0 && (
        <div
          style={{
            marginBottom: '24px',
            textAlign: 'left',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
            }}
          >
            <span style={{ fontSize: '14px', color: '#6c757d' }}>
              Retry attempts: {retryCount}/{maxRetries}
            </span>
            <span style={{ fontSize: '14px', color: '#6c757d' }}>
              {Math.round(retryProgress)}%
            </span>
          </div>
          <div
            style={{
              width: '100%',
              height: '6px',
              backgroundColor: '#e9ecef',
              borderRadius: '3px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${retryProgress}%`,
                height: '100%',
                backgroundColor: retryProgress < 100 ? '#ffc107' : '#dc3545',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center',
          flexWrap: 'wrap',
          marginBottom: showErrorDetails ? '24px' : '0',
        }}
      >
        {canRetry && (
          <button
            onClick={handleRetry}
            onKeyDown={(e) => handleKeyDown(e, handleRetry)}
            disabled={isRetrying}
            aria-label={`Retry loading component (attempt ${retryCount + 1} of ${maxRetries})`}
            style={getButtonStyle('primary', isRetrying)}
            onMouseEnter={(e) => {
              if (!isRetrying) {
                e.currentTarget.style.backgroundColor = '#0056b3';
              }
            }}
            onMouseLeave={(e) => {
              if (!isRetrying) {
                e.currentTarget.style.backgroundColor = '#007bff';
              }
            }}
            onFocus={(e) => {
              e.currentTarget.style.outline = '2px solid #0056b3';
              e.currentTarget.style.outlineOffset = '2px';
            }}
            onBlur={(e) => {
              e.currentTarget.style.outline = 'none';
            }}
          >
            {isRetrying ? (
              <>
                <span
                  style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid transparent',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                  }}
                />
                Retrying...
              </>
            ) : (
              `Try Again (${retryCount}/${maxRetries})`
            )}
          </button>
        )}

        <button
          onClick={resetError}
          onKeyDown={(e) => handleKeyDown(e, resetError)}
          aria-label="Reset component and clear error"
          style={getButtonStyle('secondary')}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#545b62';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#6c757d';
          }}
          onFocus={(e) => {
            e.currentTarget.style.outline = '2px solid #545b62';
            e.currentTarget.style.outlineOffset = '2px';
          }}
          onBlur={(e) => {
            e.currentTarget.style.outline = 'none';
          }}
        >
          Reset
        </button>

        {/* Custom Actions */}
        {customActions.map((action, index) => (
          <button
            key={index}
            onClick={action.action}
            onKeyDown={(e) => handleKeyDown(e, action.action)}
            aria-label={action.label}
            style={getButtonStyle(action.variant)}
            onMouseEnter={(e) => {
              const hoverColor = action.variant === 'primary' ? '#0056b3' : '#545b62';
              e.currentTarget.style.backgroundColor = hoverColor;
            }}
            onMouseLeave={(e) => {
              const normalColor = action.variant === 'primary' ? '#007bff' : '#6c757d';
              e.currentTarget.style.backgroundColor = normalColor;
            }}
            onFocus={(e) => {
              const focusColor = action.variant === 'primary' ? '#0056b3' : '#545b62';
              e.currentTarget.style.outline = `2px solid ${focusColor}`;
              e.currentTarget.style.outlineOffset = '2px';
            }}
            onBlur={(e) => {
              e.currentTarget.style.outline = 'none';
            }}
          >
            {action.label}
          </button>
        ))}
      </div>

      {/* Error Details Section */}
      {showErrorDetails && (
        <div
          style={{
            textAlign: 'left',
            marginTop: '24px',
            borderTop: '1px solid #e9ecef',
            paddingTop: '24px',
          }}
        >
          <button
            onClick={toggleDetails}
            onKeyDown={(e) => handleKeyDown(e, toggleDetails)}
            aria-expanded={showDetails}
            aria-controls="error-details"
            style={{
              background: 'none',
              border: 'none',
              color: '#007bff',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: showDetails ? '16px' : '0',
              padding: '4px 0',
            }}
            onFocus={(e) => {
              e.currentTarget.style.outline = '2px solid #007bff';
              e.currentTarget.style.outlineOffset = '2px';
            }}
            onBlur={(e) => {
              e.currentTarget.style.outline = 'none';
            }}
          >
            <span
              style={{
                transform: showDetails ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
              }}
            >
              ▶
            </span>
            {showDetails ? 'Hide' : 'Show'} Error Details
          </button>

          {showDetails && (
            <div
              id="error-details"
              style={{
                backgroundColor: '#f8f9fa',
                border: '1px solid #e9ecef',
                borderRadius: '6px',
                padding: '16px',
                fontSize: '12px',
                fontFamily: 'Monaco, Consolas, monospace',
                overflow: 'auto',
                maxHeight: '300px',
              }}
            >
              <div style={{ marginBottom: '12px' }}>
                <strong>Error Message:</strong>
                <pre style={{ margin: '4px 0', whiteSpace: 'pre-wrap' }}>
                  {error.message}
                </pre>
              </div>

              {error.stack && (
                <div style={{ marginBottom: '12px' }}>
                  <strong>Stack Trace:</strong>
                  <pre style={{ margin: '4px 0', whiteSpace: 'pre-wrap' }}>
                    {error.stack}
                  </pre>
                </div>
              )}

              {errorInfo?.componentStack && (
                <div>
                  <strong>Component Stack:</strong>
                  <pre style={{ margin: '4px 0', whiteSpace: 'pre-wrap' }}>
                    {errorInfo.componentStack}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Support Contact */}
      {supportContact && (
        <div
          style={{
            marginTop: '24px',
            padding: '16px',
            backgroundColor: '#f8f9fa',
            borderRadius: '6px',
            fontSize: '14px',
            color: '#6c757d',
          }}
        >
          <p style={{ margin: '0 0 8px 0' }}>
            Need help? Contact our support team:
          </p>
          <a
            href={`mailto:${supportContact}`}
            style={{
              color: '#007bff',
              textDecoration: 'none',
              fontWeight: '500',
            }}
            onFocus={(e) => {
              e.currentTarget.style.outline = '2px solid #007bff';
              e.currentTarget.style.outlineOffset = '2px';
            }}
            onBlur={(e) => {
              e.currentTarget.style.outline = 'none';
            }}
          >
            {supportContact}
          </a>
        </div>
      )}

      {/* CSS Animation for spinner */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};