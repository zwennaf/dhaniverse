import React, { useState } from 'react';
import { BaseErrorBoundary } from './BaseErrorBoundary';
import { MinimalErrorFallback } from './MinimalErrorFallback';
import { DetailedErrorFallback } from './DetailedErrorFallback';

/**
 * Component that throws an error for testing purposes
 */
const ErrorThrowingComponent: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('This is a test error for demonstrating fallback components');
  }
  return <div>✅ Component is working normally</div>;
};

/**
 * Demo component to showcase the MinimalErrorFallback and DetailedErrorFallback components
 */
export const FallbackDemo: React.FC = () => {
  const [throwMinimalError, setThrowMinimalError] = useState(false);
  const [throwDetailedError, setThrowDetailedError] = useState(false);

  const customActions = [
    {
      label: 'Reload Page',
      action: () => window.location.reload(),
      variant: 'secondary' as const,
    },
    {
      label: 'Go Home',
      action: () => window.location.href = '/',
      variant: 'secondary' as const,
    },
  ];

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Error Boundary Fallback Components Demo</h1>
      
      <div style={{ marginBottom: '40px' }}>
        <h2>Minimal Error Fallback</h2>
        <p>
          This fallback is designed for non-critical component failures. 
          It has a minimal visual footprint and provides basic retry functionality.
        </p>
        
        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={() => setThrowMinimalError(!throwMinimalError)}
            style={{
              padding: '8px 16px',
              backgroundColor: throwMinimalError ? '#dc3545' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            {throwMinimalError ? 'Fix Component' : 'Break Component'}
          </button>
        </div>

        <BaseErrorBoundary
          fallback={MinimalErrorFallback}
          retryable={true}
          maxRetries={3}
        >
          <div style={{ 
            padding: '20px', 
            border: '1px solid #ddd', 
            borderRadius: '4px',
            backgroundColor: '#f8f9fa'
          }}>
            <ErrorThrowingComponent shouldThrow={throwMinimalError} />
          </div>
        </BaseErrorBoundary>
      </div>

      <div style={{ marginBottom: '40px' }}>
        <h2>Detailed Error Fallback</h2>
        <p>
          This fallback is designed for critical component failures. 
          It provides comprehensive error information, retry functionality with progress indication,
          and support for custom actions.
        </p>
        
        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={() => setThrowDetailedError(!throwDetailedError)}
            style={{
              padding: '8px 16px',
              backgroundColor: throwDetailedError ? '#dc3545' : '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            {throwDetailedError ? 'Fix Component' : 'Break Component'}
          </button>
        </div>

        <BaseErrorBoundary
          fallback={(props) => (
            <DetailedErrorFallback
              {...props}
              title="Critical Component Failure"
              description="A critical component has encountered an error. This may affect core functionality."
              supportContact="support@dhaniverse.com"
              showErrorDetails={true}
              customActions={customActions}
            />
          )}
          retryable={true}
          maxRetries={3}
        >
          <div style={{ 
            padding: '20px', 
            border: '1px solid #ddd', 
            borderRadius: '4px',
            backgroundColor: '#f8f9fa'
          }}>
            <ErrorThrowingComponent shouldThrow={throwDetailedError} />
          </div>
        </BaseErrorBoundary>
      </div>

      <div style={{ marginBottom: '40px' }}>
        <h2>Accessibility Features</h2>
        <ul>
          <li><strong>ARIA Labels:</strong> All interactive elements have proper aria-label attributes</li>
          <li><strong>Keyboard Navigation:</strong> All buttons support Enter and Space key activation</li>
          <li><strong>Screen Reader Support:</strong> Error containers use role="alert" and aria-live attributes</li>
          <li><strong>Focus Management:</strong> Proper focus indicators and outline styles</li>
          <li><strong>Color Contrast:</strong> All text meets WCAG contrast requirements</li>
        </ul>
      </div>

      <div style={{ marginBottom: '40px' }}>
        <h2>Features Demonstrated</h2>
        <ul>
          <li><strong>Retry Functionality:</strong> Both components support retry with loading states</li>
          <li><strong>Retry Count Display:</strong> Shows current attempt and maximum attempts</li>
          <li><strong>Progress Indication:</strong> Detailed fallback shows retry progress bar</li>
          <li><strong>Custom Actions:</strong> Detailed fallback supports additional action buttons</li>
          <li><strong>Error Details:</strong> Expandable error information for debugging</li>
          <li><strong>Support Contact:</strong> Optional support contact information</li>
          <li><strong>Responsive Design:</strong> Components adapt to different screen sizes</li>
        </ul>
      </div>
    </div>
  );
};