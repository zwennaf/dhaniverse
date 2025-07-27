import { ErrorInfo, ReactNode, ComponentType } from 'react';

export interface ErrorFallbackProps {
  error: Error;
  errorInfo: ErrorInfo;
  retry: () => void;
  canRetry: boolean;
  retryCount: number;
  resetError: () => void;
}

export interface ErrorBoundaryProps {
  fallback?: ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  isolateErrors?: boolean;
  retryable?: boolean;
  maxRetries?: number;
  children: ReactNode;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  isRetrying: boolean;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryCondition: (error: Error, attempt: number) => boolean;
}

// Re-export error reporting types for convenience
export type {
  ErrorSeverity,
  ErrorCategory,
  ErrorContext,
  ErrorReport,
  ErrorReportingConfig
} from './ErrorReportingService';