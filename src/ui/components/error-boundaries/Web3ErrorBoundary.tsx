import React, { Component, ErrorInfo, ReactNode } from 'react';
import { BaseErrorBoundary } from './BaseErrorBoundary';
import { ErrorBoundaryProps, ErrorFallbackProps } from './types';
import { ErrorReportingService, ErrorSeverity, ErrorCategory } from './ErrorReportingService';

export interface WalletError extends Error {
  code?: number;
  data?: any;
}

export interface NetworkError extends Error {
  chainId?: string;
  networkName?: string;
}

export interface Web3ErrorBoundaryProps extends ErrorBoundaryProps {
  onWalletError?: (error: WalletError) => void;
  onNetworkError?: (error: NetworkError) => void;
  fallbackToLocalMode?: boolean;
  supportedChainIds?: string[];
  localModeMessage?: string;
}

interface Web3ErrorBoundaryState {
  hasWeb3Error: boolean;
  web3Error: Error | null;
  errorType: 'wallet' | 'network' | 'contract' | 'transaction' | 'unknown';
  isInLocalMode: boolean;
  lastWalletOperation?: string;
}

/**
 * Web3ErrorBoundary - Specialized error boundary for blockchain and wallet operations
 * 
 * Features:
 * - Wallet connection error handling
 * - Network switching error handling
 * - Contract interaction error handling
 * - Transaction error handling with state preservation
 * - Local mode fallback when Web3 operations fail
 * - Chain ID validation and switching
 */
export class Web3ErrorBoundary extends Component<
  Web3ErrorBoundaryProps,
  Web3ErrorBoundaryState
> {
  private web3ErrorHandler: (event: ErrorEvent) => void;
  private walletEventHandler: (event: Event) => void;

  constructor(props: Web3ErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasWeb3Error: false,
      web3Error: null,
      errorType: 'unknown',
      isInLocalMode: false,
    };

    this.web3ErrorHandler = this.handleWeb3Error.bind(this);
    this.walletEventHandler = this.handleWalletEvents.bind(this);
  }

  componentDidMount(): void {
    // Listen for Web3 specific errors
    window.addEventListener('error', this.web3ErrorHandler);
    
    // Listen for wallet events
    if ((window as any).ethereum) {
      (window as any).ethereum.on('accountsChanged', this.walletEventHandler);
      (window as any).ethereum.on('chainChanged', this.walletEventHandler);
      (window as any).ethereum.on('disconnect', this.walletEventHandler);
    }
  }

  componentWillUnmount(): void {
    window.removeEventListener('error', this.web3ErrorHandler);
    
    // Clean up wallet event listeners
    if ((window as any).ethereum) {
      (window as any).ethereum.removeListener('accountsChanged', this.walletEventHandler);
      (window as any).ethereum.removeListener('chainChanged', this.walletEventHandler);
      (window as any).ethereum.removeListener('disconnect', this.walletEventHandler);
    }
  }

  /**
   * Handle Web3-specific errors
   */
  private handleWeb3Error(event: ErrorEvent): void {
    const error = event.error;
    
    // Check if this is a Web3-related error
    if (!this.isWeb3Error(error)) {
      return;
    }

    const errorType = this.classifyWeb3Error(error);
    
    this.setState({
      hasWeb3Error: true,
      web3Error: error,
      errorType,
      lastWalletOperation: this.extractWalletOperation(error),
    });

    // Report the Web3 error
    this.reportWeb3Error(error, errorType);

    // Handle specific error types
    this.handleSpecificWeb3Error(error, errorType);
  }

  /**
   * Handle wallet-specific events
   */
  private handleWalletEvents(event: Event): void {
    // This can be used to handle wallet state changes that might affect error recovery
    console.log('Wallet event:', event.type);
  }

  /**
   * Check if an error is Web3-related
   */
  private isWeb3Error(error: Error): boolean {
    if (!error) return false;

    const web3ErrorPatterns = [
      /metamask/i,
      /wallet/i,
      /ethereum/i,
      /web3/i,
      /contract/i,
      /transaction/i,
      /gas/i,
      /nonce/i,
      /chain/i,
      /network/i,
      /rpc/i,
      /provider/i,
    ];

    const errorMessage = error.message.toLowerCase();
    const errorStack = (error.stack || '').toLowerCase();
    
    return web3ErrorPatterns.some(pattern => 
      pattern.test(errorMessage) || pattern.test(errorStack)
    );
  }

  /**
   * Classify Web3 error type
   */
  private classifyWeb3Error(error: Error): Web3ErrorBoundaryState['errorType'] {
    const message = error.message.toLowerCase();
    
    if (message.includes('wallet') || message.includes('metamask') || message.includes('connect')) {
      return 'wallet';
    }
    if (message.includes('network') || message.includes('chain') || message.includes('rpc')) {
      return 'network';
    }
    if (message.includes('contract') || message.includes('call') || message.includes('execution')) {
      return 'contract';
    }
    if (message.includes('transaction') || message.includes('gas') || message.includes('nonce')) {
      return 'transaction';
    }
    
    return 'unknown';
  }

  /**
   * Extract wallet operation from error
   */
  private extractWalletOperation(error: Error): string {
    const operationPatterns = [
      /(\w+)\s*transaction/i,
      /(\w+)\s*contract/i,
      /(\w+)\s*call/i,
      /(\w+)\s*method/i,
    ];

    for (const pattern of operationPatterns) {
      const match = error.message.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return 'Unknown';
  }

  /**
   * Report Web3 error to ErrorReportingService
   */
  private reportWeb3Error(error: Error, errorType: Web3ErrorBoundaryState['errorType']): void {
    const errorReportingService = ErrorReportingService.getInstance();
    
    const context = {
      componentName: 'Web3ErrorBoundary',
      routePath: window.location.pathname,
      userSession: {
        isAuthenticated: this.checkAuthenticationStatus(),
        walletConnected: this.checkWalletStatus(),
      },
      web3Context: {
        chainId: this.getCurrentChainId(),
        walletType: this.getWalletType(),
        isConnected: this.checkWalletStatus(),
      },
      timestamp: Date.now(),
    };

    errorReportingService.reportError(
      error,
      { componentStack: 'Web3ErrorBoundary' } as ErrorInfo,
      context,
      ErrorSeverity.HIGH,
      ErrorCategory.WEB3,
      {
        boundaryType: 'Web3ErrorBoundary',
        errorType,
        walletOperation: this.state.lastWalletOperation,
      }
    );
  }

  /**
   * Handle specific Web3 error types
   */
  private handleSpecificWeb3Error(error: Error, errorType: Web3ErrorBoundaryState['errorType']): void {
    switch (errorType) {
      case 'wallet':
        if (this.props.onWalletError) {
          this.props.onWalletError(error as WalletError);
        }
        break;
      case 'network':
        if (this.props.onNetworkError) {
          this.props.onNetworkError(error as NetworkError);
        }
        break;
      default:
        break;
    }

    // If fallback to local mode is enabled, activate it for certain error types
    if (this.props.fallbackToLocalMode && this.shouldFallbackToLocalMode(errorType)) {
      this.activateLocalMode();
    }
  }

  /**
   * Check if should fallback to local mode for this error type
   */
  private shouldFallbackToLocalMode(errorType: Web3ErrorBoundaryState['errorType']): boolean {
    return ['wallet', 'network', 'contract'].includes(errorType);
  }

  /**
   * Activate local mode fallback
   */
  private activateLocalMode(): void {
    this.setState({ isInLocalMode: true });
    
    // Store local mode state in localStorage
    localStorage.setItem('web3_local_mode', 'true');
    
    // Emit custom event for other components to react to local mode
    window.dispatchEvent(new CustomEvent('web3LocalModeActivated'));
  }

  /**
   * Get current chain ID
   */
  private getCurrentChainId(): string | undefined {
    try {
      return (window as any).ethereum?.chainId;
    } catch {
      return undefined;
    }
  }

  /**
   * Get wallet type
   */
  private getWalletType(): string {
    if ((window as any).ethereum?.isMetaMask) return 'MetaMask';
    if ((window as any).ethereum?.isCoinbaseWallet) return 'Coinbase';
    if ((window as any).ethereum?.isWalletConnect) return 'WalletConnect';
    return 'Unknown';
  }

  /**
   * Check authentication status
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
   * Check wallet connection status
   */
  private checkWalletStatus(): boolean {
    try {
      return !!(window as any).ethereum?.selectedAddress;
    } catch {
      return false;
    }
  }

  /**
   * Retry Web3 operation
   */
  private handleWeb3Retry = async (): Promise<void> => {
    const { errorType } = this.state;
    
    try {
      // For wallet errors, try to reconnect
      if (errorType === 'wallet' && (window as any).ethereum) {
        await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
      }
      
      // For network errors, check if we're on the right chain
      if (errorType === 'network' && this.props.supportedChainIds) {
        const currentChainId = this.getCurrentChainId();
        if (currentChainId && !this.props.supportedChainIds.includes(currentChainId)) {
          // Could implement chain switching here
          console.warn('Unsupported chain ID:', currentChainId);
        }
      }
      
      // Reset error state
      this.resetWeb3Error();
    } catch (retryError) {
      console.error('Web3 retry failed:', retryError);
      // Could update state to show retry failed
    }
  };

  /**
   * Exit local mode and retry Web3
   */
  private handleExitLocalMode = (): void => {
    this.setState({ isInLocalMode: false });
    localStorage.removeItem('web3_local_mode');
    window.dispatchEvent(new CustomEvent('web3LocalModeDeactivated'));
    this.resetWeb3Error();
  };

  /**
   * Reset Web3 error state
   */
  private resetWeb3Error = (): void => {
    this.setState({
      hasWeb3Error: false,
      web3Error: null,
      errorType: 'unknown',
      lastWalletOperation: undefined,
    });
  };

  /**
   * Custom fallback for Web3 errors
   */
  private renderWeb3ErrorFallback(): ReactNode {
    const { web3Error, errorType, isInLocalMode } = this.state;
    const { localModeMessage, fallbackToLocalMode } = this.props;

    if (isInLocalMode) {
      return (
        <div 
          role="alert" 
          style={{
            padding: '20px',
            border: '1px solid #28a745',
            borderRadius: '8px',
            backgroundColor: '#f8fff9',
            color: '#155724',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <h2 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>
            Local Mode Active
          </h2>
          
          <p style={{ margin: '0 0 16px 0' }}>
            {localModeMessage || 'Web3 features are temporarily unavailable. You\'re now in local mode with limited functionality.'}
          </p>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              onClick={this.handleExitLocalMode}
              style={{
                padding: '8px 16px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Try Web3 Again
            </button>
          </div>
        </div>
      );
    }

    const getErrorTitle = () => {
      switch (errorType) {
        case 'wallet': return 'Wallet Error';
        case 'network': return 'Network Error';
        case 'contract': return 'Contract Error';
        case 'transaction': return 'Transaction Error';
        default: return 'Web3 Error';
      }
    };

    const getErrorMessage = () => {
      switch (errorType) {
        case 'wallet': return 'There was an issue with your wallet connection. Please check your wallet and try again.';
        case 'network': return 'Network error occurred. Please check your connection and network settings.';
        case 'contract': return 'Smart contract interaction failed. Please try again.';
        case 'transaction': return 'Transaction failed. Please check your gas settings and try again.';
        default: return 'A Web3-related error occurred. Please try again.';
      }
    };

    return (
      <div 
        role="alert" 
        style={{
          padding: '20px',
          border: '1px solid #dc3545',
          borderRadius: '8px',
          backgroundColor: '#fff5f5',
          color: '#721c24',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <h2 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>
          {getErrorTitle()}
        </h2>
        
        <p style={{ margin: '0 0 16px 0' }}>
          {getErrorMessage()}
        </p>

        {process.env.NODE_ENV === 'development' && web3Error && (
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
              {web3Error.message}
              {web3Error.stack && `\n\nStack trace:\n${web3Error.stack}`}
            </pre>
          </details>
        )}

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={this.handleWeb3Retry}
            style={{
              padding: '8px 16px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Retry Web3 Operation
          </button>
          
          {fallbackToLocalMode && (
            <button
              onClick={this.activateLocalMode}
              style={{
                padding: '8px 16px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Switch to Local Mode
            </button>
          )}
          
          <button
            onClick={this.resetWeb3Error}
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
    const { hasWeb3Error } = this.state;

    // If there's a Web3 error, show the Web3 error fallback
    if (hasWeb3Error) {
      return this.renderWeb3ErrorFallback();
    }

    // Otherwise, wrap children in BaseErrorBoundary for regular error handling
    return (
      <BaseErrorBoundary {...baseProps}>
        {children}
      </BaseErrorBoundary>
    );
  }
}