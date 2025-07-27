import React, { useState } from 'react';
import { BaseErrorBoundary } from './BaseErrorBoundary';
import { ErrorFallbackProps } from './types';

// Component that can throw errors for testing
const ErrorProneComponent: React.FC<{ shouldThrow: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('This is a test error from ErrorProneComponent');
  }
  
  return (
    <div style={{ padding: '20px', backgroundColor: '#e8f5e8', borderRadius: '8px' }}>
      <h3>✅ Component is working correctly!</h3>
      <p>This component is rendering without any errors.</p>
    </div>
  );
};

// Custom fallback component for demonstration
const CustomErrorFallback: React.FC<ErrorFallbackProps> = ({ 
  error, 
  retry, 
  canRetry, 
  retryCount, 
  resetError 
}) => (
  <div style={{
    padding: '20px',
    backgroundColor: '#fff3cd',
    border: '1px solid #ffeaa7',
    borderRadius: '8px',
    color: '#856404'
  }}>
    <h3>🚨 Custom Error Handler</h3>
    <p><strong>Error:</strong> {error.message}</p>
    <p><strong>Retry attempts:</strong> {retryCount}</p>
    
    <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
      {canRetry && (
        <button 
          onClick={retry}
          style={{
            padding: '8px 16px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          🔄 Retry ({retryCount}/3)
        </button>
      )}
      
      <button 
        onClick={resetError}
        style={{
          padding: '8px 16px',
          backgroundColor: '#6c757d',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        🔄 Reset
      </button>
    </div>
  </div>
);

/**
 * Demo component to showcase BaseErrorBoundary functionality
 * This component demonstrates:
 * - Error catching and fallback UI
 * - Custom fallback components
 * - Retry mechanisms
 * - Error reporting
 */
export const ErrorBoundaryDemo: React.FC = () => {
  const [shouldThrow, setShouldThrow] = useState(false);
  const [useCustomFallback, setUseCustomFallback] = useState(false);
  const [errorLog, setErrorLog] = useState<string[]>([]);

  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    const logEntry = `[${new Date().toLocaleTimeString()}] Error: ${error.message}`;
    setErrorLog(prev => [...prev, logEntry]);
    console.error('Error caught by demo:', error, errorInfo);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1>🛡️ Error Boundary Demo</h1>
      
      <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
        <h3>Controls</h3>
        
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              checked={shouldThrow}
              onChange={(e) => setShouldThrow(e.target.checked)}
            />
            Throw Error
          </label>
        </div>
        
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              checked={useCustomFallback}
              onChange={(e) => setUseCustomFallback(e.target.checked)}
            />
            Use Custom Fallback
          </label>
        </div>
        
        <button
          onClick={() => setErrorLog([])}
          style={{
            padding: '8px 16px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Clear Error Log
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Component with Error Boundary</h3>
        <BaseErrorBoundary
          fallback={useCustomFallback ? CustomErrorFallback : undefined}
          onError={handleError}
          retryable={true}
          maxRetries={3}
        >
          <ErrorProneComponent shouldThrow={shouldThrow} />
        </BaseErrorBoundary>
      </div>

      {errorLog.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h3>Error Log</h3>
          <div style={{
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            padding: '12px',
            fontFamily: 'monospace',
            fontSize: '14px'
          }}>
            {errorLog.map((log, index) => (
              <div key={index}>{log}</div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: '30px', padding: '16px', backgroundColor: '#e9ecef', borderRadius: '8px' }}>
        <h3>How to Use</h3>
        <ol>
          <li>Check "Throw Error" to simulate a component error</li>
          <li>Toggle "Use Custom Fallback" to see different fallback UIs</li>
          <li>Use the retry buttons to attempt recovery</li>
          <li>Check the error log to see captured errors</li>
        </ol>
      </div>
    </div>
  );
};