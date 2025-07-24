/**
 * Web3 Error Handler Utilities
 * 
 * Centralized error handling for Web3 wallet operations with user-friendly messages
 */

export enum Web3ErrorCode {
  // Wallet Connection Errors
  WALLET_NOT_INSTALLED = 'WALLET_NOT_INSTALLED',
  USER_REJECTED_CONNECTION = 'USER_REJECTED_CONNECTION',
  CONNECTION_PENDING = 'CONNECTION_PENDING',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNSUPPORTED_WALLET = 'UNSUPPORTED_WALLET',
  
  // Authentication Errors
  SIGNATURE_REJECTED = 'SIGNATURE_REJECTED',
  SIGNATURE_VERIFICATION_FAILED = 'SIGNATURE_VERIFICATION_FAILED',
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  AUTH_TIMEOUT = 'AUTH_TIMEOUT',
  
  // Session Management Errors
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  WALLET_DISCONNECTED = 'WALLET_DISCONNECTED',
  ACCOUNT_CHANGED = 'ACCOUNT_CHANGED',
  CHAIN_CHANGED = 'CHAIN_CHANGED',
  
  // Generic Errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface Web3Error {
  code: Web3ErrorCode;
  message: string;
  userMessage: string;
  originalError?: any;
  retryable: boolean;
}

export class Web3ErrorHandler {
  /**
   * Handle wallet connection errors
   */
  static handleWalletError(error: any): Web3Error {
    console.error('Wallet error:', error);
    
    // MetaMask/Ethereum provider error codes
    if (error.code === 4001) {
      return {
        code: Web3ErrorCode.USER_REJECTED_CONNECTION,
        message: 'User rejected connection request',
        userMessage: 'Connection rejected. Please try again and approve the connection request.',
        originalError: error,
        retryable: true
      };
    }
    
    if (error.code === -32002) {
      return {
        code: Web3ErrorCode.CONNECTION_PENDING,
        message: 'Connection request already pending',
        userMessage: 'Connection request pending. Please check your wallet and approve the request.',
        originalError: error,
        retryable: false
      };
    }
    
    if (error.code === -32603) {
      return {
        code: Web3ErrorCode.NETWORK_ERROR,
        message: 'Internal JSON-RPC error',
        userMessage: 'Network error occurred. Please check your connection and try again.',
        originalError: error,
        retryable: true
      };
    }
    
    // Check for wallet not installed
    if (error.message?.includes('not installed') || error.message?.includes('not detected')) {
      return {
        code: Web3ErrorCode.WALLET_NOT_INSTALLED,
        message: 'Wallet not installed or detected',
        userMessage: 'Wallet not detected. Please install the wallet extension and refresh the page.',
        originalError: error,
        retryable: false
      };
    }
    
    return {
      code: Web3ErrorCode.UNKNOWN_ERROR,
      message: error.message || 'Unknown wallet error',
      userMessage: 'Failed to connect wallet. Please try again.',
      originalError: error,
      retryable: true
    };
  }
  
  /**
   * Handle signature-related errors
   */
  static handleSignatureError(error: any): Web3Error {
    console.error('Signature error:', error);
    
    if (error.code === 4001) {
      return {
        code: Web3ErrorCode.SIGNATURE_REJECTED,
        message: 'User rejected signature request',
        userMessage: 'Signature rejected. Please sign the message to authenticate.',
        originalError: error,
        retryable: true
      };
    }
    
    if (error.message?.includes('verification failed')) {
      return {
        code: Web3ErrorCode.SIGNATURE_VERIFICATION_FAILED,
        message: 'Signature verification failed',
        userMessage: 'Authentication failed. Please try signing in again.',
        originalError: error,
        retryable: true
      };
    }
    
    return {
      code: Web3ErrorCode.UNKNOWN_ERROR,
      message: error.message || 'Unknown signature error',
      userMessage: 'Failed to sign authentication message. Please try again.',
      originalError: error,
      retryable: true
    };
  }
  
  /**
   * Handle session management errors
   */
  static handleSessionError(error: any): Web3Error {
    console.error('Session error:', error);
    
    if (error.message?.includes('expired')) {
      return {
        code: Web3ErrorCode.SESSION_EXPIRED,
        message: 'Session has expired',
        userMessage: 'Your session has expired. Please sign in again.',
        originalError: error,
        retryable: true
      };
    }
    
    if (error.message?.includes('disconnected')) {
      return {
        code: Web3ErrorCode.WALLET_DISCONNECTED,
        message: 'Wallet disconnected',
        userMessage: 'Wallet disconnected. Please reconnect your wallet.',
        originalError: error,
        retryable: true
      };
    }
    
    return {
      code: Web3ErrorCode.UNKNOWN_ERROR,
      message: error.message || 'Unknown session error',
      userMessage: 'Session error occurred. Please try again.',
      originalError: error,
      retryable: true
    };
  }
  
  /**
   * Get user-friendly error message for display
   */
  static getUserMessage(error: Web3Error): string {
    return error.userMessage;
  }
  
  /**
   * Check if an error is retryable
   */
  static isRetryable(error: Web3Error): boolean {
    return error.retryable;
  }
  
  /**
   * Create a generic Web3 error
   */
  static createError(
    code: Web3ErrorCode,
    message: string,
    userMessage: string,
    retryable: boolean = true,
    originalError?: any
  ): Web3Error {
    return {
      code,
      message,
      userMessage,
      originalError,
      retryable
    };
  }
}