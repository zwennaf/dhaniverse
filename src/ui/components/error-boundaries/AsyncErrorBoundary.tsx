import React, { Component, ErrorInfo, ReactNode } from 'react';
import { BaseErrorBoundary } from './BaseErrorBoundary';
import { ErrorBoundaryProps, ErrorFallbackProps } from './types';
import { ErrorReportingService, ErrorSeverity, ErrorCategory } from './ErrorReportingService';

export interface AsyncErrorBoundaryProps extends ErrorBoundaryProps {
  onAsyncError?: (error: Error) => void;
  asyncRetryDelay?: number;
  networkErrorRetry?: boolean;
  asyncOperationTimeout?: number;
}

interface AsyncErrorBoundaryState {
  hasAsyncError: boolean;
  asyncError: Error | null;
  isNetworkError: boolean;
  lastAsyncOperation?: string;
}

/**
 * AsyncErrorBoundary - Specialized error boundary for handling promise rejections
 * and async operation failures that don't get caught by regular error boundaries.
 * 
 * Features:
 * - Catches unhandled promise rejections
 * - Network error detection and retry logic
 * - Async operation timeout handling
 * - Integration with BaseErrorBoundary for standard error handling
 */
export class AsyncErrorBoundary extends Component<
  AsyncErrorBoundaryProps,
  AsyncErrorBoundaryState
> {
  private unhandledRejectionHandler: (event: PromiseRejectionEvent) => void;
  private networkRetryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: AsyncErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasAsyncError: false,
      asyncError: null,
      isNetworkError: false,
    };

    // Bind the unhandled rejection handler
    this.unhandledRejectionHandler = this.handleUnhandledRejection.bind(this);
  }

  componentDidMount(): void {
    // Listen for unhandled promise rejections
    window.addEventListener('unhandledrejection', this.unhandledRejectionHandler);
  }

  componentWillUnmount(): void {
    // Clean up event listener
    window.removeEventListener('unhandledrejection', this.unhandledRejectionHandler);
    
    // Clear any pending timeouts
    if (this.networkRetryTimeoutId) {
      clearTimeout(this.networkRetryTimeoutId);
    }
  }

  /**
   * Handle unhandled promise rejections
   */
  private handleUnhandledRejection(event: PromiseRejectionEvent): void {
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
    
    // Check if this is a network-related error
    const isNetworkError = this.isNetworkError(error);
    
    // Update state to show async error
    this.setState({
      hasAsyncError: true,
      asyncError: error,
      isNetworkError,
      lastAsyncOperation: this.extractOperationFromError(error),
    });

    // Report the async error
    this.reportAsyncError(error, isNetworkError);

    // Call custom async error handler if provided
    if (this.props.onAsyncError) {
      this.props.onAsyncError(error);
    }

    // Prevent the default browser behavior (logging to console)
    event.preventDefault();
  }

  /**
   * Check if an error is network-related
   */
  private isNetworkError(error: Error): boolean {
    const networkErrorPatterns = [
      /network/i,
      /fetch/i,
      /timeout/i,
      /connection/i,
      /cors/i,
      /failed to fetch/i,
      /load failed/i,
      /net::/i,
    ];

    const errorMessage = error.message.toLowerCase();
    return networkErrorPatterns.some(pattern => pattern.test(errorMessage));
  }

  /**
   * Extract operation name from error message or stack
   */
  private extractOperationFromError(error: Error): string {
    // Try to extract operation from error message
    const operationPatterns = [
      /(\w+)\s*operation/i,
      /(\w+)\s*request/i,
      /(\w+)\s*call/i,
      /(\w+)\s*fetch/i,
    ];

    for (const pattern of operationPatterns) {
      const match = error.message.match(pattern);
      if (match) {
        return match[1];
      }
    }

    // Try to extract from stack trace
    if (error.stack) {
      const stackLines = error.stack.split('\n');
      for (const line of stackLines) {
        const match = line.match(/at\s+(\w+)/);
        if (match && match[1] !== 'Object' && match[1] !== 'Promise') {
          return match[1];
        }
      }
    }

    return 'Unknown';
  }

  /**
   * Report async error to ErrorReportingService
   */
  private reportAsyncError(error: Error, isNetworkError: boolean): void {
    const errorReportingService = ErrorReportingService.getInstance();
    
    const context = {
      componentName: 'AsyncErrorBoundary',
      routePath: window.location.pathname,
      userSession: {
        isAuthenticated: this.checkAuthenticationStatus(),
        walletConnected: this.checkWalletStatus(),
      },
      timestamp: Date.now(),
      asyncOperation: this.state.lastAsyncOperation,
      isNetworkError,
    };

    const severity = isNetworkError ? ErrorSeverity.MEDIUM : ErrorSeverity.HIGH;
    const category = isNetworkError ? ErrorCategory.NETWORK : ErrorCategory.UI;

    errorReportingService.reportError(
      error,
      { componentStack: 'AsyncErrorBoundary' } as ErrorInfo,
      context,
      severity,
      category,
      {
        boundaryType: 'AsyncErrorBoundary',
        isAsyncError: true,
        isNetworkError,
      }
    );
  }

  /**
   * Check authentication status (placeholder)
   */
  private checkAuthenticationStatus(): boolean {
    try {
      const authData = localStorage.getItem('auth');
      return authData ? JSON.parse(authData).isAuthenticated : false;
    } catch {
      return false;
    }
  }

  /**
   * Check wallet status (placeholder)
   */
  private checkWalletStatus(): boolean {
    try {
      return !!(window as any).ethereum?.selectedAddress;
    } catch {
      return false;
    }
  }

  /**
   * Retry async operation with network connectivity check
   */
  private handleAsyncRetry = (): void => {
    const { asyncRetryDelay = 2000, networkErrorRetry = true } = this.props;
    
    if (this.state.isNetworkError && networkErrorRetry) {
      // For network errors, check connectivity before retrying
      this.checkNetworkConnectivity().then(isOnline => {
        if (isOnline) {
          this.resetAsyncError();
        } else {
          // Schedule retry when network is back
          this.scheduleNetworkRetry();
        }
      });
    } else {
      // For non-network errors, retry after delay
      setTimeout(() => {
        this.resetAsyncError();
      }, asyncRetryDelay);
    }
  };

  /**
   * Check network connectivity
   */
  private async checkNetworkConnectivity(): Promise<boolean> {
    try {
      const response = await fetch('/favicon.ico', { 
        method: 'HEAD',
        cache: 'no-cache',
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Schedule retry when network connectivity is restored
   */
  private scheduleNetworkRetry(): void {
    const checkInterval = 5000; // Check every 5 seconds
    
    this.networkRetryTimeoutId = setTimeout(async () => {
      const isOnline = await this.checkNetworkConnectivity();
      if (isOnline) {
        this.resetAsyncError();
      } else {
        this.scheduleNetworkRetry(); // Continue checking
      }
    }, checkInterval);
  }

  /**
   * Reset async error state
   */
  private resetAsyncError = (): void => {
    this.setState({
      hasAsyncError: false,
      asyncError: null,
      isNetworkError: false,
      lastAsyncOperation: undefined,
    });
  };

  /**
   * Custom fallback for async errors
   */
  private renderAsyncErrorFallback(): ReactNode {
    const { asyncError, isNetworkError, lastAsyncOperation } = this.state;
    const { networkErrorRetry = true } = this.props;

    return (
      <div 
        role="alert" 
        style={{
          padding: '20px',
          border: '1px solid #ff8c00',
          borderRadius: '8px',
          backgroundColor: '#fff8f0',
          color: '#cc6600',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <h2 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>
          {isNetworkError ? 'Network Error' : 'Async Operation Failed'}
        </h2>
        
        <p style={{ margin: '0 0 16px 0' }}>
          {isNetworkError 
            ? 'A network error occurred. Please check your connection and try again.'
            : `An error occurred during ${lastAsyncOperation || 'async operation'}.`
          }
        </p>

        {process.env.NODE_ENV === 'development' && asyncError && (
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
              {asyncError.message}
              {asyncError.stack && `\n\nStack trace:\n${asyncError.stack}`}
            </pre>
          </details>
        )}

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={this.handleAsyncRetry}
            style={{
              padding: '8px 16px',
              backgroundColor: '#ff8c00',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            {isNetworkError && networkErrorRetry ? 'Check Connection & Retry' : 'Try Again'}
          </button>
          
          <button
            onClick={this.resetAsyncError}
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
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  render(): ReactNode {
    const { children, ...baseProps } = this.props;
    const { hasAsyncError } = this.state;

    // If there's an async error, show the async error fallback
    if (hasAsyncError) {
      return this.renderAsyncErrorFallback();
    }

    // Otherwise, wrap children in BaseErrorBoundary for regular error handling
    return (
      <BaseErrorBoundary {...baseProps}>
        {children}
      </BaseErrorBoundary>
    );
  }
}