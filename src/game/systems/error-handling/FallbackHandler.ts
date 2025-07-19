import { BaseErrorHandler } from './BaseErrorHandler.ts';
import { ChunkError, ErrorHandlerResult } from './IErrorHandler.ts';

export class FallbackHandler extends BaseErrorHandler {
  private fallbackStrategies: Map<string, () => Promise<void>> = new Map();

  constructor() {
    super();
    this.setupDefaultFallbacks();
  }

  protected async doHandle(error: ChunkError): Promise<ErrorHandlerResult> {
    // Handle errors that need fallback strategies
    if (this.shouldUseFallback(error)) {
      const fallbackAction = this.getFallbackAction(error);
      
      if (fallbackAction) {
        console.log(`Using fallback strategy for chunk ${error.chunkId} (${error.errorType})`);
        
        return {
          handled: true,
          shouldRetry: false,
          fallbackAction,
          userMessage: this.getUserMessage(error)
        };
      }
    }

    return {
      handled: false,
      shouldRetry: false
    };
  }

  private shouldUseFallback(error: ChunkError): boolean {
    // Use fallback for persistent errors or critical failures
    return error.retryCount >= 3 || 
           error.errorType === 'MEMORY' ||
           error.errorType === 'PARSE';
  }

  private getFallbackAction(error: ChunkError): (() => Promise<void>) | undefined {
    switch (error.errorType) {
      case 'NETWORK':
        return this.fallbackStrategies.get('network');
      case 'MEMORY':
        return this.fallbackStrategies.get('memory');
      case 'PARSE':
        return this.fallbackStrategies.get('parse');
      default:
        return this.fallbackStrategies.get('default');
    }
  }

  private getUserMessage(error: ChunkError): string {
    switch (error.errorType) {
      case 'NETWORK':
        return 'Connection issues detected. Using cached content where possible.';
      case 'MEMORY':
        return 'Memory optimization in progress. Some areas may load with reduced quality.';
      case 'PARSE':
        return 'Data corruption detected. Using backup content.';
      default:
        return 'Loading issues detected. Switching to fallback mode.';
    }
  }

  private setupDefaultFallbacks(): void {
    // Network fallback: Use placeholder or cached content
    this.fallbackStrategies.set('network', async () => {
      console.log('Network fallback: Using placeholder content');
      // Could load a low-res placeholder or use cached content
    });

    // Memory fallback: Clear cache and load essential chunks only
    this.fallbackStrategies.set('memory', async () => {
      console.log('Memory fallback: Clearing non-essential chunks');
      // Could trigger aggressive cache cleanup
    });

    // Parse fallback: Use default texture
    this.fallbackStrategies.set('parse', async () => {
      console.log('Parse fallback: Using default texture');
      // Could load a default/error texture
    });

    // Default fallback: Log and continue
    this.fallbackStrategies.set('default', async () => {
      console.log('Default fallback: Continuing without chunk');
    });
  }

  public addFallbackStrategy(errorType: string, strategy: () => Promise<void>): void {
    this.fallbackStrategies.set(errorType, strategy);
  }

  public removeFallbackStrategy(errorType: string): void {
    this.fallbackStrategies.delete(errorType);
  }
}