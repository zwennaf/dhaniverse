export class ICPErrorHandler {
  private static failureCount = 0;
  private static lastFailureTime = 0;
  private static readonly CIRCUIT_BREAKER_THRESHOLD = 5;
  private static readonly CIRCUIT_BREAKER_TIMEOUT = 30000; // 30 seconds
  private static readonly MAX_RETRY_ATTEMPTS = 3;
  private static readonly BASE_RETRY_DELAY = 1000; // 1 second

  static isCircuitBreakerOpen(): boolean {
    const now = Date.now();
    
    // Reset circuit breaker after timeout
    if (now - this.lastFailureTime > this.CIRCUIT_BREAKER_TIMEOUT) {
      this.failureCount = 0;
      return false;
    }
    
    return this.failureCount >= this.CIRCUIT_BREAKER_THRESHOLD;
  }

  static recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
  }

  static recordSuccess(): void {
    this.failureCount = 0;
  }

  static async withRetryAndFallback<T>(
    operation: () => Promise<T>,
    fallback: () => Promise<T> | T,
    operationName: string = 'ICP Operation'
  ): Promise<T> {
    // Check circuit breaker
    if (this.isCircuitBreakerOpen()) {
      console.warn(`Circuit breaker open for ${operationName}, using fallback`);
      return await fallback();
    }

    let lastError: Error | null = null;

    // Retry with exponential backoff
    for (let attempt = 0; attempt < this.MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        const result = await operation();
        this.recordSuccess();
        return result;
      } catch (error) {
        lastError = error as Error;
        console.warn(`${operationName} attempt ${attempt + 1} failed:`, error);

        // Don't retry on the last attempt
        if (attempt < this.MAX_RETRY_ATTEMPTS - 1) {
          const delay = this.BASE_RETRY_DELAY * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed, record failure and use fallback
    this.recordFailure();
    console.error(`${operationName} failed after ${this.MAX_RETRY_ATTEMPTS} attempts, using fallback:`, lastError);
    
    try {
      return await fallback();
    } catch (fallbackError) {
      console.error(`Fallback also failed for ${operationName}:`, fallbackError);
      throw new Error(`Both ${operationName} and fallback failed. Last ICP error: ${lastError?.message}, Fallback error: ${fallbackError}`);
    }
  }

  static getNetworkStatus(): {
    healthy: boolean;
    failureCount: number;
    circuitBreakerOpen: boolean;
    lastFailureTime: number;
  } {
    return {
      healthy: this.failureCount === 0,
      failureCount: this.failureCount,
      circuitBreakerOpen: this.isCircuitBreakerOpen(),
      lastFailureTime: this.lastFailureTime
    };
  }

  static reset(): void {
    this.failureCount = 0;
    this.lastFailureTime = 0;
  }
}

export interface NetworkHealthStatus {
  icpHealthy: boolean;
  mongoHealthy: boolean;
  overallHealthy: boolean;
  lastChecked: number;
  errors: string[];
}

export class NetworkHealthMonitor {
  private static healthStatus: NetworkHealthStatus = {
    icpHealthy: true,
    mongoHealthy: true,
    overallHealthy: true,
    lastChecked: Date.now(),
    errors: []
  };

  private static healthCheckInterval: NodeJS.Timeout | null = null;
  private static readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

  static startHealthMonitoring(
    icpHealthCheck: () => Promise<boolean>,
    mongoHealthCheck: () => Promise<boolean>
  ): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck(icpHealthCheck, mongoHealthCheck);
    }, this.HEALTH_CHECK_INTERVAL);

    // Perform initial health check
    this.performHealthCheck(icpHealthCheck, mongoHealthCheck);
  }

  static stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  private static async performHealthCheck(
    icpHealthCheck: () => Promise<boolean>,
    mongoHealthCheck: () => Promise<boolean>
  ): Promise<void> {
    const errors: string[] = [];
    let icpHealthy = true;
    let mongoHealthy = true;

    // Check ICP health
    try {
      icpHealthy = await icpHealthCheck();
      if (!icpHealthy) {
        errors.push('ICP canister not responding');
      }
    } catch (error) {
      icpHealthy = false;
      errors.push(`ICP health check failed: ${error}`);
    }

    // Check MongoDB health
    try {
      mongoHealthy = await mongoHealthCheck();
      if (!mongoHealthy) {
        errors.push('MongoDB not responding');
      }
    } catch (error) {
      mongoHealthy = false;
      errors.push(`MongoDB health check failed: ${error}`);
    }

    this.healthStatus = {
      icpHealthy,
      mongoHealthy,
      overallHealthy: icpHealthy || mongoHealthy, // System is healthy if at least one backend works
      lastChecked: Date.now(),
      errors
    };

    // Log health status changes
    if (!icpHealthy || !mongoHealthy) {
      console.warn('Network health issues detected:', this.healthStatus);
    }
  }

  static getHealthStatus(): NetworkHealthStatus {
    return { ...this.healthStatus };
  }

  static isHealthy(): boolean {
    return this.healthStatus.overallHealthy;
  }
}

export const createUserFriendlyErrorMessage = (error: any): string => {
  const errorString = error?.toString() || 'Unknown error';
  
  if (errorString.includes('network') || errorString.includes('fetch')) {
    return 'Network connection issue. Please check your internet connection and try again.';
  }
  
  if (errorString.includes('canister') || errorString.includes('actor')) {
    return 'Blockchain service temporarily unavailable. Your data is safe and will sync when service is restored.';
  }
  
  if (errorString.includes('authentication') || errorString.includes('identity')) {
    return 'Wallet authentication issue. Please reconnect your wallet and try again.';
  }
  
  if (errorString.includes('insufficient')) {
    return 'Insufficient funds for this transaction.';
  }
  
  if (errorString.includes('timeout')) {
    return 'Request timed out. The blockchain might be busy. Please try again in a moment.';
  }
  
  return 'An unexpected error occurred. Your local data is safe. Please try again or contact support if the issue persists.';
};