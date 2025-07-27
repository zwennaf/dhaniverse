import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorBoundaryProps, ErrorBoundaryState, ErrorFallbackProps } from './types';
import { ErrorReportingService, ErrorSeverity, ErrorCategory } from './ErrorReportingService';

/**
 * BaseErrorBoundary - Core error boundary component that catches JavaScript errors
 * anywhere in the child component tree and displays a fallback UI instead of crashing.
 * 
 * Features:
 * - Error catching with componentDidCatch lifecycle
 * - Retry mechanism with configurable max attempts
 * - Custom fallback UI support
 * - Error reporting integration
 * - State management for error information and retry counting
 */
export class BaseErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false,
    };
  }

  /**
   * Static method called when an error is thrown during rendering
   * Updates state to trigger fallback UI rendering
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  /**
   * Lifecycle method called after an error has been thrown
   * Handles error logging and reporting
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Update state with error information
    this.setState({
      errorInfo,
    });

    // Report error using ErrorReportingService
    this.reportError(error, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by BaseErrorBoundary:', error);
      console.error('Component stack:', errorInfo.componentStack);
    }
  }

  /**
   * Report error to ErrorReportingService with context
   */
  private reportError(error: Error, errorInfo: ErrorInfo): void {
    const errorReportingService = ErrorReportingService.getInstance();
    
    // Extract component name from error info
    const componentName = this.extractComponentName(errorInfo.componentStack || '');
    
    // Collect error context
    const context = {
      componentName,
      routePath: window.location.pathname,
      userSession: {
        isAuthenticated: this.checkAuthenticationStatus(),
        walletConnected: this.checkWalletStatus(),
      },
      gameState: {
        isGameActive: this.checkGameStatus(),
      },
      timestamp: Date.now(),
    };

    // Report the error
    errorReportingService.reportError(
      error,
      errorInfo,
      context,
      ErrorSeverity.HIGH, // Default to HIGH for component errors
      ErrorCategory.UI,   // Default to UI category
      {
        retryCount: this.state.retryCount,
        boundaryType: 'BaseErrorBoundary',
      }
    );
  }

  /**
   * Extract component name from component stack
   */
  private extractComponentName(componentStack: string): string {
    const lines = componentStack.split('\n');
    for (const line of lines) {
      const match = line.trim().match(/^in (\w+)/);
      if (match && match[1] !== 'ErrorBoundary') {
        return match[1];
      }
    }
    return 'Unknown';
  }

  /**
   * Check if user is authenticated (placeholder - should be replaced with actual auth check)
   */
  private checkAuthenticationStatus(): boolean {
    // This is a placeholder - in a real app, you'd check your auth context/store
    try {
      const authData = localStorage.getItem('auth');
      return authData ? JSON.parse(authData).isAuthenticated : false;
    } catch {
      return false;
    }
  }

  /**
   * Check if wallet is connected (placeholder - should be replaced with actual wallet check)
   */
  private checkWalletStatus(): boolean {
    // This is a placeholder - in a real app, you'd check your wallet context/store
    try {
      return !!(window as any).ethereum?.selectedAddress;
    } catch {
      return false;
    }
  }

  /**
   * Check if game is active (placeholder - should be replaced with actual game check)
   */
  private checkGameStatus(): boolean {
    // This is a placeholder - in a real app, you'd check your game context/store
    try {
      return document.querySelector('#game-container') !== null;
    } catch {
      return false;
    }
  }

  /**
   * Retry mechanism - attempts to re-render the failed component
   * Implements exponential backoff for retry attempts
   */
  private handleRetry = (): void => {
    const { maxRetries = 3 } = this.props;
    
    if (this.state.retryCount >= maxRetries) {
      console.warn('Maximum retry attempts reached');
      return;
    }

    this.setState({ isRetrying: true });

    // Calculate delay with exponential backoff
    const delay = Math.min(1000 * Math.pow(2, this.state.retryCount), 10000);

    this.retryTimeoutId = setTimeout(() => {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1,
        isRetrying: false,
      }));
    }, delay);
  };

  /**
   * Reset error state - clears all error information and retry count
   */
  private handleResetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false,
    });
  };

  /**
   * Cleanup timeout on component unmount
   */
  componentWillUnmount(): void {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  /**
   * Default fallback component when no custom fallback is provided
   */
  private renderDefaultFallback(): ReactNode {
    const { error, errorInfo, retryCount, isRetrying } = this.state;
    const { maxRetries = 3, retryable = true } = this.props;
    
    const canRetry = retryable && retryCount < maxRetries;

    return (
      <div 
        role="alert" 
        style={{
          padding: '20px',
          border: '1px solid #ff6b6b',
          borderRadius: '8px',
          backgroundColor: '#fff5f5',
          color: '#c92a2a',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <h2 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>
          Something went wrong
        </h2>
        
        <p style={{ margin: '0 0 16px 0' }}>
          An error occurred while rendering this component.
        </p>

        {process.env.NODE_ENV === 'development' && error && (
          <details style={{ marginBottom: '16px' }}>
            <summary style={{ cursor: 'pointer', marginBottom: '8px' }}>
              Error Details
            </summary>
            <pre style={{ 
              fontSize: '12px', 
              backgroundColor: '#f8f9fa', 
              padding: '12px',
              borderRadius: '4px',
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
            }}>
              {error.message}
              {error.stack && `\n\nStack trace:\n${error.stack}`}
              {errorInfo?.componentStack && `\n\nComponent stack:${errorInfo.componentStack}`}
            </pre>
          </details>
        )}

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {canRetry && (
            <button
              onClick={this.handleRetry}
              disabled={isRetrying}
              style={{
                padding: '8px 16px',
                backgroundColor: isRetrying ? '#ccc' : '#228be6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: isRetrying ? 'not-allowed' : 'pointer',
                fontSize: '14px',
              }}
            >
              {isRetrying ? 'Retrying...' : `Try Again (${retryCount}/${maxRetries})`}
            </button>
          )}
          
          <button
            onClick={this.handleResetError}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Reset
          </button>
        </div>
      </div>
    );
  }

  render(): ReactNode {
    const { hasError, error, errorInfo, retryCount, isRetrying } = this.state;
    const { children, fallback: CustomFallback, maxRetries = 3, retryable = true } = this.props;

    // If no error, render children normally
    if (!hasError) {
      return children;
    }

    // Prepare props for fallback component
    const fallbackProps: ErrorFallbackProps = {
      error: error!,
      errorInfo: errorInfo!,
      retry: this.handleRetry,
      canRetry: retryable && retryCount < maxRetries,
      retryCount,
      resetError: this.handleResetError,
    };

    // Render custom fallback if provided, otherwise use default
    if (CustomFallback) {
      try {
        return <CustomFallback {...fallbackProps} />;
      } catch (fallbackError) {
        // If custom fallback also fails, use default fallback
        console.error('Custom fallback component failed:', fallbackError);
        return this.renderDefaultFallback();
      }
    }

    return this.renderDefaultFallback();
  }
}