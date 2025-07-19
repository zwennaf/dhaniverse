import { ChunkError } from './IErrorHandler.ts';

export interface ErrorLogEntry {
  id: string;
  error: ChunkError;
  handled: boolean;
  resolution: string;
  timestamp: number;
}

export class ErrorLogger {
  private logs: ErrorLogEntry[] = [];
  private maxLogs: number = 1000;
  private logId: number = 0;

  public logError(error: ChunkError, handled: boolean, resolution: string): void {
    const entry: ErrorLogEntry = {
      id: `error_${++this.logId}`,
      error: { ...error },
      handled,
      resolution,
      timestamp: Date.now()
    };

    this.logs.push(entry);

    // Maintain max log size
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console logging based on severity
    this.consoleLog(entry);
  }

  private consoleLog(entry: ErrorLogEntry): void {
    const { error, handled, resolution } = entry;
    const prefix = `[ChunkError ${error.chunkId}]`;
    
    if (handled) {
      console.warn(`${prefix} ${error.errorType}: ${error.message} - ${resolution}`);
    } else {
      console.error(`${prefix} UNHANDLED ${error.errorType}: ${error.message}`);
    }
  }

  public getRecentErrors(count: number = 10): ErrorLogEntry[] {
    return this.logs.slice(-count);
  }

  public getErrorsByType(errorType: string): ErrorLogEntry[] {
    return this.logs.filter(entry => entry.error.errorType === errorType);
  }

  public getErrorsByChunk(chunkId: string): ErrorLogEntry[] {
    return this.logs.filter(entry => entry.error.chunkId === chunkId);
  }

  public getUnhandledErrors(): ErrorLogEntry[] {
    return this.logs.filter(entry => !entry.handled);
  }

  public getErrorStats(): {
    total: number;
    handled: number;
    unhandled: number;
    byType: Record<string, number>;
    recentErrors: number; // Last 5 minutes
  } {
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    const recentErrors = this.logs.filter(entry => entry.timestamp > fiveMinutesAgo);
    
    const byType: Record<string, number> = {};
    this.logs.forEach(entry => {
      byType[entry.error.errorType] = (byType[entry.error.errorType] || 0) + 1;
    });

    return {
      total: this.logs.length,
      handled: this.logs.filter(entry => entry.handled).length,
      unhandled: this.logs.filter(entry => !entry.handled).length,
      byType,
      recentErrors: recentErrors.length
    };
  }

  public clearLogs(): void {
    this.logs = [];
    this.logId = 0;
  }

  public exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  public setMaxLogs(maxLogs: number): void {
    this.maxLogs = Math.max(100, maxLogs); // Minimum 100 logs
    
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }
}