import { IErrorHandler, ChunkError, ErrorHandlerResult } from './IErrorHandler.ts';
import { RetryHandler } from './RetryHandler.ts';
import { FallbackHandler } from './FallbackHandler.ts';
import { GracefulDegradationHandler } from './GracefulDegradationHandler.ts';
import { ErrorLogger } from './ErrorLogger.ts';

export class ErrorHandlerChain {
  private chain: IErrorHandler;
  private logger: ErrorLogger;

  constructor() {
    this.logger = new ErrorLogger();
    
    // Create handlers
    const retryHandler = new RetryHandler(3, 1000, 10000);
    const fallbackHandler = new FallbackHandler();
    const degradationHandler = new GracefulDegradationHandler();

    // Chain them together: Retry -> Fallback -> Degradation
    this.chain = retryHandler
      .setNext(fallbackHandler)
      .setNext(degradationHandler);
  }

  public async handleError(error: ChunkError): Promise<ErrorHandlerResult> {
    try {
      const result = await this.chain.handle(error);
      
      // Log the error and its resolution
      const resolution = this.getResolutionDescription(result);
      this.logger.logError(error, result.handled, resolution);

      // Execute fallback action if provided
      if (result.fallbackAction) {
        try {
          await result.fallbackAction();
        } catch (fallbackError) {
          console.error(`Fallback action failed for chunk ${error.chunkId}:`, fallbackError);
        }
      }

      return result;
    } catch (handlerError) {
      console.error(`Error handler chain failed for chunk ${error.chunkId}:`, handlerError);
      
      // Log the handler failure
      const errorMessage = handlerError instanceof Error ? handlerError.message : String(handlerError);
      this.logger.logError(error, false, `Handler chain failed: ${errorMessage}`);
      
      return {
        handled: false,
        shouldRetry: false,
        userMessage: 'An unexpected error occurred while handling the chunk loading failure.'
      };
    }
  }

  private getResolutionDescription(result: ErrorHandlerResult): string {
    if (!result.handled) {
      return 'Unhandled error';
    }

    if (result.shouldRetry) {
      return `Retry scheduled${result.retryDelay ? ` in ${result.retryDelay}ms` : ''}`;
    }

    if (result.fallbackAction) {
      return 'Fallback action applied';
    }

    return 'Error handled';
  }

  public createError(
    chunkId: string,
    errorType: ChunkError['errorType'],
    message: string,
    retryCount: number = 0,
    originalError?: Error
  ): ChunkError {
    return {
      chunkId,
      errorType,
      message,
      timestamp: Date.now(),
      retryCount,
      originalError
    };
  }

  public getLogger(): ErrorLogger {
    return this.logger;
  }

  public getErrorStats() {
    return this.logger.getErrorStats();
  }

  public getRecentErrors(count: number = 10) {
    return this.logger.getRecentErrors(count);
  }

  // Configuration methods
  public configureRetryHandler(maxRetries: number, baseDelay: number, maxDelay: number): void {
    // Would need to expose configuration on the handlers
    // For now, recreate the chain with new settings
    const retryHandler = new RetryHandler(maxRetries, baseDelay, maxDelay);
    const fallbackHandler = new FallbackHandler();
    const degradationHandler = new GracefulDegradationHandler();

    this.chain = retryHandler
      .setNext(fallbackHandler)
      .setNext(degradationHandler);
  }

  public addFallbackStrategy(errorType: string, strategy: () => Promise<void>): void {
    // This would require exposing the fallback handler
    // For now, this is a placeholder for the interface
    console.log(`Adding fallback strategy for ${errorType}`);
  }

  public clearErrorLogs(): void {
    this.logger.clearLogs();
  }
}