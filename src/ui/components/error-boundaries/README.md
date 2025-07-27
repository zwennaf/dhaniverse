# React Error Boundaries

This directory contains the core error boundary infrastructure for the Dhaniverse application.

## Components

### BaseErrorBoundary

The `BaseErrorBoundary` is the core error boundary component that provides:

- **Error Catching**: Catches JavaScript errors in child components using React's error boundary lifecycle methods
- **Retry Mechanism**: Configurable retry functionality with exponential backoff
- **Custom Fallback UI**: Support for custom fallback components
- **Error Reporting**: Integration with error reporting systems
- **State Management**: Comprehensive error state management with retry counting

#### Basic Usage

```tsx
import { BaseErrorBoundary } from './error-boundaries';

function App() {
  return (
    <BaseErrorBoundary>
      <MyComponent />
    </BaseErrorBoundary>
  );
}
```

#### Advanced Usage

```tsx
import { BaseErrorBoundary, ErrorFallbackProps } from './error-boundaries';

const CustomFallback: React.FC<ErrorFallbackProps> = ({ error, retry, canRetry }) => (
  <div>
    <h2>Oops! Something went wrong</h2>
    <p>{error.message}</p>
    {canRetry && <button onClick={retry}>Try Again</button>}
  </div>
);

function App() {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Send to error reporting service
    console.error('Application error:', error, errorInfo);
  };

  return (
    <BaseErrorBoundary
      fallback={CustomFallback}
      onError={handleError}
      retryable={true}
      maxRetries={3}
    >
      <MyComponent />
    </BaseErrorBoundary>
  );
}
```

## Props

### ErrorBoundaryProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `fallback` | `ComponentType<ErrorFallbackProps>` | `undefined` | Custom fallback component to render when error occurs |
| `onError` | `(error: Error, errorInfo: ErrorInfo) => void` | `undefined` | Callback function called when error is caught |
| `isolateErrors` | `boolean` | `true` | Whether to isolate errors to this boundary |
| `retryable` | `boolean` | `true` | Whether retry functionality is enabled |
| `maxRetries` | `number` | `3` | Maximum number of retry attempts |
| `children` | `ReactNode` | - | Child components to protect |

### ErrorFallbackProps

| Prop | Type | Description |
|------|------|-------------|
| `error` | `Error` | The error that was caught |
| `errorInfo` | `ErrorInfo` | React error info with component stack |
| `retry` | `() => void` | Function to retry rendering the component |
| `canRetry` | `boolean` | Whether retry is available |
| `retryCount` | `number` | Current number of retry attempts |
| `resetError` | `() => void` | Function to reset error state |

## Features

### Error Catching
- Uses React's `componentDidCatch` lifecycle method
- Catches errors during rendering, lifecycle methods, and constructors
- Prevents error propagation to parent components

### Retry Mechanism
- Exponential backoff retry logic
- Configurable maximum retry attempts
- Automatic retry with delay
- Manual retry through UI buttons

### Fallback UI
- Default fallback UI with error information
- Support for custom fallback components
- Graceful fallback when custom components fail
- Accessible error UI with proper ARIA labels

### Error Reporting
- Integration with custom error handlers
- Development vs production error display
- Component stack trace information
- Error metadata collection

## Integration Examples

### Wrapping Routes
```tsx
<BaseErrorBoundary fallback={RouteErrorFallback}>
  <Route path="/game" component={GamePage} />
</BaseErrorBoundary>
```

### Protecting Features
```tsx
<BaseErrorBoundary fallback={FeatureErrorFallback} maxRetries={2}>
  <BankingDashboard />
</BaseErrorBoundary>
```

### Critical Components
```tsx
<BaseErrorBoundary fallback={CriticalErrorFallback} retryable={false}>
  <PaymentProcessor />
</BaseErrorBoundary>
```

## Demo

Use the `ErrorBoundaryDemo` component to test and demonstrate error boundary functionality:

```tsx
import { ErrorBoundaryDemo } from './error-boundaries';

function DemoPage() {
  return <ErrorBoundaryDemo />;
}
```

## Requirements Fulfilled

This implementation fulfills the following requirements:

- **1.1**: Error boundary catches errors and prevents propagation to root
- **1.2**: Application displays fallback UI instead of blank screen
- **1.3**: Other features continue to function when one component fails
- **2.1**: User-friendly error messages displayed
- **2.2**: "Try Again" and "Reload Component" options provided
- **2.3**: Technical stack traces hidden from end users
- **2.4**: Contextual information about failed features
- **2.5**: Retry functionality for component recovery

## Next Steps

This core infrastructure enables the implementation of:
- Specialized error boundaries (Web3, Game, Route-specific)
- Hook-based error handling utilities
- Error reporting and logging systems
- Advanced retry and recovery mechanisms
#
# ErrorReportingService

The `ErrorReportingService` provides comprehensive error reporting and logging capabilities with automatic error classification, context collection, and analytics.

### Features

- **Error Classification**: Automatically classifies errors by severity (LOW, MEDIUM, HIGH, CRITICAL) and category (UI, NETWORK, WEB3, GAME, AUTH, STORAGE)
- **Context Collection**: Captures detailed error context including component info, user session, game state, and timestamp
- **Console Logging**: Logs errors to console with appropriate log levels based on severity
- **Error Statistics**: Provides analytics on error frequency, types, and patterns
- **Report Filtering**: Filter error reports by severity, category, component, or time range
- **Session Limits**: Prevents spam by limiting maximum reports per session
- **Remote Reporting**: Optional integration with external error reporting services

### Usage

```tsx
import { ErrorReportingService, ErrorSeverity, ErrorCategory } from './error-boundaries';

// Get singleton instance with configuration
const errorReportingService = ErrorReportingService.getInstance({
  enableConsoleLogging: true,
  enableRemoteReporting: false,
  maxReportsPerSession: 50,
  enableUserFeedback: true,
});

// Report an error with full context
await errorReportingService.reportError(
  error,
  errorInfo,
  {
    componentName: 'MyComponent',
    userSession: { 
      userId: 'user123',
      isAuthenticated: true, 
      walletConnected: false 
    },
    gameState: { isGameActive: true, currentScene: 'MainScene' },
  },
  ErrorSeverity.HIGH,
  ErrorCategory.UI,
  { customMetadata: 'additional info' }
);

// Get error statistics
const stats = errorReportingService.getErrorStats();
console.log(`Total errors: ${stats.totalErrors}`);
console.log(`Critical errors: ${stats.errorsBySeverity.critical}`);

// Filter reports by criteria
const criticalErrors = errorReportingService.getFilteredReports({
  severity: ErrorSeverity.CRITICAL,
  timeRange: { start: Date.now() - 3600000, end: Date.now() }
});

// Clear all reports
errorReportingService.clearReports();
```

### Error Classification

The service automatically classifies errors based on error messages and context:

#### Severity Levels
- **CRITICAL**: Syntax errors, reference errors, function call errors that break functionality
- **HIGH**: Network timeouts, wallet errors, blockchain errors that impact major features
- **MEDIUM**: Validation errors, permission errors, unauthorized access
- **LOW**: Minor UI glitches and other non-critical issues

#### Categories
- **UI**: React component errors and rendering issues
- **NETWORK**: API failures, timeouts, CORS errors, HTTP errors
- **WEB3**: Wallet connection, blockchain transaction, MetaMask errors
- **GAME**: Phaser game engine errors, scene initialization failures
- **AUTH**: Authentication and authorization errors, token issues
- **STORAGE**: LocalStorage, SessionStorage, IndexedDB errors

### Configuration Options

```tsx
interface ErrorReportingConfig {
  enableConsoleLogging: boolean;      // Log to browser console
  enableRemoteReporting: boolean;     // Send to remote endpoint
  maxReportsPerSession: number;       // Limit reports per session
  reportingEndpoint?: string;         // Remote reporting URL
  enableUserFeedback: boolean;        // Allow user feedback collection
  enableStackTrace: boolean;          // Include stack traces
  enableContextCollection: boolean;   // Collect full error context
}
```

### Integration with BaseErrorBoundary

The `BaseErrorBoundary` automatically integrates with `ErrorReportingService`:

```tsx
import { BaseErrorBoundary } from './error-boundaries';

function App() {
  return (
    <BaseErrorBoundary
      retryable={true}
      maxRetries={3}
      onError={(error, errorInfo) => {
        // ErrorReportingService is automatically called
        // Custom handling can be added here
        console.log('Additional custom error handling');
      }}
    >
      <YourComponent />
    </BaseErrorBoundary>
  );
}
```

### Error Report Structure

```tsx
interface ErrorReport {
  id: string;                    // Unique report identifier
  timestamp: number;             // Error occurrence time
  error: Error;                  // Original error object
  errorInfo: ErrorInfo;          // React error info
  userAgent: string;             // Browser user agent
  url: string;                   // Current page URL
  userId?: string;               // User identifier (if available)
  componentStack: string;        // React component stack
  severity: ErrorSeverity;       // Classified severity level
  category: ErrorCategory;       // Classified error category
  context: ErrorContext;         // Full error context
  metadata?: Record<string, any>; // Additional metadata
  stackTrace: string;            // JavaScript stack trace
}
```

### Demo Component

Use `ErrorReportingDemo` to test and visualize the error reporting system:

```tsx
import { ErrorReportingDemo } from './error-boundaries';

function DemoPage() {
  return <ErrorReportingDemo />;
}
```

The demo allows you to:
- Simulate different types of errors (Critical, Network, Web3, Game, Auth, UI)
- View real-time error statistics
- Browse detailed error reports
- Test error classification and context collection

### Requirements Fulfilled

This ErrorReportingService implementation fulfills the following requirements:

- **3.1**: Detailed error information logging with stack traces
- **3.2**: Component stack information capture
- **3.3**: Error context collection with timestamp, user session, and metadata
- **3.4**: Integration support for external error reporting services
- **3.5**: Error categorization by severity and component type