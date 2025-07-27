import { ErrorInfo } from 'react';

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',           // Non-critical UI glitches
  MEDIUM = 'medium',     // Feature degradation
  HIGH = 'high',         // Major feature failure
  CRITICAL = 'critical'  // App-breaking errors
}

// Error categories
export enum ErrorCategory {
  UI = 'ui',             // React component errors
  NETWORK = 'network',   // API/network failures
  WEB3 = 'web3',         // Blockchain/wallet errors
  GAME = 'game',         // Phaser game errors
  AUTH = 'auth',         // Authentication errors
  STORAGE = 'storage'    // LocalStorage/ICP storage errors
}

// Error context information
export interface ErrorContext {
  componentName: string;
  componentProps?: Record<string, any>;
  routePath: string;
  userSession?: {
    userId?: string;
    isAuthenticated: boolean;
    walletConnected: boolean;
  };
  gameState?: {
    isGameActive: boolean;
    currentScene?: string;
  };
  timestamp: number;
}

// Error report data structure
export interface ErrorReport {
  id: string;
  timestamp: number;
  error: Error;
  errorInfo: ErrorInfo;
  userAgent: string;
  url: string;
  userId?: string;
  componentStack: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  context: ErrorContext;
  metadata?: Record<string, any>;
  stackTrace: string;
}

// Error reporting configuration
export interface ErrorReportingConfig {
  enableConsoleLogging: boolean;
  enableRemoteReporting: boolean;
  maxReportsPerSession: number;
  reportingEndpoint?: string;
  enableUserFeedback: boolean;
  enableStackTrace: boolean;
  enableContextCollection: boolean;
}

// Default configuration
const DEFAULT_CONFIG: ErrorReportingConfig = {
  enableConsoleLogging: true,
  enableRemoteReporting: false,
  maxReportsPerSession: 50,
  enableUserFeedback: true,
  enableStackTrace: true,
  enableContextCollection: true,
};

/**
 * Centralized error reporting and logging service
 * Handles error classification, context collection, and reporting
 */
export class ErrorReportingService {
  private static instance: ErrorReportingService;
  private config: ErrorReportingConfig;
  private reportCount: number = 0;
  private reports: ErrorReport[] = [];

  private constructor(config: Partial<ErrorReportingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get singleton instance of ErrorReportingService
   */
  public static getInstance(config?: Partial<ErrorReportingConfig>): ErrorReportingService {
    if (!ErrorReportingService.instance) {
      ErrorReportingService.instance = new ErrorReportingService(config);
    }
    return ErrorReportingService.instance;
  }

  /**
   * Update service configuration
   */
  public updateConfig(config: Partial<ErrorReportingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Report an error with full context and classification
   */
  public async reportError(
    error: Error,
    errorInfo: ErrorInfo,
    context: Partial<ErrorContext>,
    severity?: ErrorSeverity,
    category?: ErrorCategory,
    metadata?: Record<string, any>
  ): Promise<void> {
    // Check if we've exceeded the maximum reports per session
    if (this.reportCount >= this.config.maxReportsPerSession) {
      console.warn('Maximum error reports per session exceeded');
      return;
    }

    // Generate unique error report ID
    const reportId = this.generateReportId();

    // Classify error if not provided
    const classifiedSeverity = severity || this.classifyErrorSeverity(error);
    const classifiedCategory = category || this.classifyErrorCategory(error, context);

    // Collect full error context
    const fullContext = this.config.enableContextCollection 
      ? this.collectErrorContext(context)
      : this.createMinimalContext(context);

    // Create error report
    const report: ErrorReport = {
      id: reportId,
      timestamp: Date.now(),
      error,
      errorInfo,
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: fullContext.userSession?.userId,
      componentStack: errorInfo.componentStack || '',
      severity: classifiedSeverity,
      category: classifiedCategory,
      context: fullContext,
      metadata,
      stackTrace: this.config.enableStackTrace ? error.stack || '' : '',
    };

    // Store report
    this.reports.push(report);
    this.reportCount++;

    // Log to console if enabled
    if (this.config.enableConsoleLogging) {
      this.logToConsole(report);
    }

    // Send to remote endpoint if enabled
    if (this.config.enableRemoteReporting && this.config.reportingEndpoint) {
      await this.sendToRemote(report);
    }
  }

  /**
   * Classify error severity based on error type and message
   */
  private classifyErrorSeverity(error: Error): ErrorSeverity {
    const errorMessage = error.message.toLowerCase();
    const errorName = error.name.toLowerCase();

    // Critical errors
    if (
      errorName.includes('syntaxerror') ||
      errorName.includes('referenceerror') ||
      errorMessage.includes('cannot read property') ||
      errorMessage.includes('is not a function')
    ) {
      return ErrorSeverity.CRITICAL;
    }

    // High severity errors
    if (
      errorMessage.includes('network') ||
      errorMessage.includes('fetch') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('wallet') ||
      errorMessage.includes('blockchain')
    ) {
      return ErrorSeverity.HIGH;
    }

    // Medium severity errors
    if (
      errorMessage.includes('validation') ||
      errorMessage.includes('permission') ||
      errorMessage.includes('unauthorized')
    ) {
      return ErrorSeverity.MEDIUM;
    }

    // Default to low severity
    return ErrorSeverity.LOW;
  }

  /**
   * Classify error category based on error characteristics and context
   */
  private classifyErrorCategory(error: Error, context: Partial<ErrorContext>): ErrorCategory {
    const errorMessage = error.message.toLowerCase();
    const componentName = context.componentName?.toLowerCase() || '';

    // Web3 related errors
    if (
      errorMessage.includes('wallet') ||
      errorMessage.includes('metamask') ||
      errorMessage.includes('web3') ||
      errorMessage.includes('blockchain') ||
      errorMessage.includes('transaction') ||
      componentName.includes('wallet') ||
      componentName.includes('web3')
    ) {
      return ErrorCategory.WEB3;
    }

    // Network related errors
    if (
      errorMessage.includes('fetch') ||
      errorMessage.includes('network') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('cors') ||
      errorMessage.includes('http')
    ) {
      return ErrorCategory.NETWORK;
    }

    // Game related errors
    if (
      errorMessage.includes('phaser') ||
      errorMessage.includes('game') ||
      componentName.includes('game') ||
      componentName.includes('phaser') ||
      context.gameState?.isGameActive
    ) {
      return ErrorCategory.GAME;
    }

    // Authentication related errors
    if (
      errorMessage.includes('auth') ||
      errorMessage.includes('login') ||
      errorMessage.includes('token') ||
      errorMessage.includes('unauthorized') ||
      componentName.includes('auth') ||
      componentName.includes('login')
    ) {
      return ErrorCategory.AUTH;
    }

    // Storage related errors
    if (
      errorMessage.includes('storage') ||
      errorMessage.includes('localstorage') ||
      errorMessage.includes('sessionstorage') ||
      errorMessage.includes('indexeddb')
    ) {
      return ErrorCategory.STORAGE;
    }

    // Default to UI category
    return ErrorCategory.UI;
  }

  /**
   * Collect comprehensive error context
   */
  private collectErrorContext(partialContext: Partial<ErrorContext>): ErrorContext {
    const currentPath = window.location.pathname;
    
    // Try to get user session info from various sources
    const userSession = partialContext.userSession || {
      isAuthenticated: false,
      walletConnected: false,
    };

    // Try to get game state if available
    const gameState = partialContext.gameState || {
      isGameActive: false,
    };

    return {
      componentName: partialContext.componentName || 'Unknown',
      componentProps: partialContext.componentProps,
      routePath: currentPath,
      userSession,
      gameState,
      timestamp: Date.now(),
    };
  }

  /**
   * Create minimal context when full context collection is disabled
   */
  private createMinimalContext(partialContext: Partial<ErrorContext>): ErrorContext {
    return {
      componentName: partialContext.componentName || 'Unknown',
      routePath: window.location.pathname,
      userSession: {
        isAuthenticated: false,
        walletConnected: false,
      },
      timestamp: Date.now(),
    };
  }

  /**
   * Generate unique report ID
   */
  private generateReportId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log error report to console with appropriate formatting
   */
  private logToConsole(report: ErrorReport): void {
    const logLevel = this.getConsoleLogLevel(report.severity);
    const logMethod = console[logLevel] || console.error;

    logMethod.call(console, `[ErrorReporting] ${report.severity.toUpperCase()} - ${report.category.toUpperCase()}`, {
      id: report.id,
      error: report.error.message,
      component: report.context.componentName,
      timestamp: new Date(report.timestamp).toISOString(),
      stackTrace: report.stackTrace,
      context: report.context,
      metadata: report.metadata,
    });
  }

  /**
   * Get appropriate console log level for error severity
   */
  private getConsoleLogLevel(severity: ErrorSeverity): 'error' | 'warn' | 'info' {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return 'error';
      case ErrorSeverity.MEDIUM:
        return 'warn';
      case ErrorSeverity.LOW:
      default:
        return 'info';
    }
  }

  /**
   * Send error report to remote endpoint
   */
  private async sendToRemote(report: ErrorReport): Promise<void> {
    if (!this.config.reportingEndpoint) {
      return;
    }

    try {
      // Create sanitized report for remote sending (remove sensitive data)
      const sanitizedReport = {
        id: report.id,
        timestamp: report.timestamp,
        message: report.error.message,
        name: report.error.name,
        userAgent: report.userAgent,
        url: report.url,
        componentStack: report.componentStack,
        severity: report.severity,
        category: report.category,
        context: {
          componentName: report.context.componentName,
          routePath: report.context.routePath,
          timestamp: report.context.timestamp,
          userSession: {
            isAuthenticated: report.context.userSession?.isAuthenticated || false,
            walletConnected: report.context.userSession?.walletConnected || false,
          },
          gameState: report.context.gameState,
        },
        metadata: report.metadata,
        stackTrace: report.stackTrace,
      };

      await fetch(this.config.reportingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sanitizedReport),
      });
    } catch (error) {
      console.warn('Failed to send error report to remote endpoint:', error);
    }
  }

  /**
   * Get all error reports for the current session
   */
  public getReports(): ErrorReport[] {
    return [...this.reports];
  }

  /**
   * Get error reports filtered by criteria
   */
  public getFilteredReports(filters: {
    severity?: ErrorSeverity;
    category?: ErrorCategory;
    componentName?: string;
    timeRange?: { start: number; end: number };
  }): ErrorReport[] {
    return this.reports.filter(report => {
      if (filters.severity && report.severity !== filters.severity) {
        return false;
      }
      if (filters.category && report.category !== filters.category) {
        return false;
      }
      if (filters.componentName && report.context.componentName !== filters.componentName) {
        return false;
      }
      if (filters.timeRange) {
        if (report.timestamp < filters.timeRange.start || report.timestamp > filters.timeRange.end) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Clear all stored error reports
   */
  public clearReports(): void {
    this.reports = [];
    this.reportCount = 0;
  }

  /**
   * Get error statistics for the current session
   */
  public getErrorStats(): {
    totalErrors: number;
    errorsBySeverity: Record<ErrorSeverity, number>;
    errorsByCategory: Record<ErrorCategory, number>;
    mostFrequentComponent: string | null;
  } {
    const errorsBySeverity = {
      [ErrorSeverity.LOW]: 0,
      [ErrorSeverity.MEDIUM]: 0,
      [ErrorSeverity.HIGH]: 0,
      [ErrorSeverity.CRITICAL]: 0,
    };

    const errorsByCategory = {
      [ErrorCategory.UI]: 0,
      [ErrorCategory.NETWORK]: 0,
      [ErrorCategory.WEB3]: 0,
      [ErrorCategory.GAME]: 0,
      [ErrorCategory.AUTH]: 0,
      [ErrorCategory.STORAGE]: 0,
    };

    const componentCounts: Record<string, number> = {};

    this.reports.forEach(report => {
      errorsBySeverity[report.severity]++;
      errorsByCategory[report.category]++;
      
      const componentName = report.context.componentName;
      componentCounts[componentName] = (componentCounts[componentName] || 0) + 1;
    });

    const componentNames = Object.keys(componentCounts);
    const mostFrequentComponent = componentNames.length > 0 
      ? componentNames.reduce((a, b) => componentCounts[a] > componentCounts[b] ? a : b)
      : null;

    return {
      totalErrors: this.reports.length,
      errorsBySeverity,
      errorsByCategory,
      mostFrequentComponent,
    };
  }
}