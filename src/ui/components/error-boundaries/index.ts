export { BaseErrorBoundary } from './BaseErrorBoundary';
export { MinimalErrorFallback } from './MinimalErrorFallback';
export { DetailedErrorFallback } from './DetailedErrorFallback';
export { FallbackDemo } from './FallbackDemo';
export { ErrorBoundaryDemo } from './ErrorBoundaryDemo';
export { ErrorReportingDemo } from './ErrorReportingDemo';
export { 
  ErrorReportingService,
  ErrorSeverity,
  ErrorCategory
} from './ErrorReportingService';
export type { 
  ErrorBoundaryProps, 
  ErrorBoundaryState, 
  ErrorFallbackProps,
  RetryConfig,
  ErrorContext,
  ErrorReport,
  ErrorReportingConfig
} from './types';