import { BaseErrorHandler } from './BaseErrorHandler.ts';
import { ChunkError, ErrorHandlerResult } from './IErrorHandler.ts';

export class RetryHandler extends BaseErrorHandler {
  private maxRetries: number;
  private baseDelay: number;
  private maxDelay: number;

  constructor(maxRetries: number = 3, baseDelay: number = 1000, maxDelay: number = 10000) {
    super();
    this.maxRetries = maxRetries;
    this.baseDelay = baseDelay;
    this.maxDelay = maxDelay;
  }

  protected async doHandle(error: ChunkError): Promise<ErrorHandlerResult> {
    // Handle retryable errors
    if (this.isRetryableError(error) && error.retryCount < this.maxRetries) {
      const retryDelay = this.calculateRetryDelay(error.retryCount);
      
      console.log(`Retrying chunk ${error.chunkId} (attempt ${error.retryCount + 1}/${this.maxRetries}) after ${retryDelay}ms`);
      
      return {
        handled: true,
        shouldRetry: true,
        retryDelay
      };
    }

    // Don't handle if max retries exceeded or not retryable
    return {
      handled: false,
      shouldRetry: false
    };
  }

  private isRetryableError(error: ChunkError): boolean {
    return error.errorType === 'NETWORK' || 
           error.errorType === 'TIMEOUT' ||
           error.errorType === 'UNKNOWN';
  }

  private calculateRetryDelay(retryCount: number): number {
    // Exponential backoff with jitter
    const exponentialDelay = this.baseDelay * Math.pow(2, retryCount);
    const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter
    const delay = exponentialDelay + jitter;
    
    return Math.min(delay, this.maxDelay);
  }

  public updateConfig(maxRetries: number, baseDelay: number, maxDelay: number): void {
    this.maxRetries = maxRetries;
    this.baseDelay = baseDelay;
    this.maxDelay = maxDelay;
  }
}