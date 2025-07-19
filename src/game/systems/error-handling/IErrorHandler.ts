export interface ChunkError {
  chunkId: string;
  errorType: 'NETWORK' | 'TIMEOUT' | 'PARSE' | 'MEMORY' | 'UNKNOWN';
  message: string;
  timestamp: number;
  retryCount: number;
  originalError?: Error;
}

export interface ErrorHandlerResult {
  handled: boolean;
  shouldRetry: boolean;
  retryDelay?: number;
  fallbackAction?: () => Promise<void>;
  userMessage?: string;
}

export interface IErrorHandler {
  setNext(handler: IErrorHandler): IErrorHandler;
  handle(error: ChunkError): Promise<ErrorHandlerResult>;
}