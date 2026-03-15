'use client';

// V6 Error Resilience System
// Provides automatic retry logic, graceful failure handling, and fallback UI states

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryCondition?: (error: Error) => boolean;
}

export interface ResilienceConfig {
  enableRetry: boolean;
  enableFallback: boolean;
  enableCircuitBreaker: boolean;
  circuitBreakerThreshold: number;
  circuitBreakerTimeout: number;
}

export class ErrorResilienceManager {
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private defaultRetryConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffFactor: 2,
    retryCondition: (error) => {
      // Retry on network errors, timeouts, and 5xx status codes
      return error.message.includes('network') ||
             error.message.includes('timeout') ||
             error.message.includes('500') ||
             error.message.includes('502') ||
             error.message.includes('503') ||
             error.message.includes('504');
    }
  };

  private defaultResilienceConfig: ResilienceConfig = {
    enableRetry: true,
    enableFallback: true,
    enableCircuitBreaker: true,
    circuitBreakerThreshold: 5,
    circuitBreakerTimeout: 60000
  };

  // Execute operation with resilience
  async executeWithResilience<T>(
    operation: () => Promise<T>,
    operationId: string,
    retryConfig?: Partial<RetryConfig>,
    resilienceConfig?: Partial<ResilienceConfig>
  ): Promise<T> {
    const config = { ...this.defaultRetryConfig, ...retryConfig };
    const resilience = { ...this.defaultResilienceConfig, ...resilienceConfig };

    // Check circuit breaker
    if (resilience.enableCircuitBreaker) {
      const circuitBreaker = this.getCircuitBreaker(operationId, resilience);
      if (circuitBreaker.isOpen()) {
        throw new Error(`Circuit breaker is open for operation: ${operationId}`);
      }
    }

    let lastError: Error;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        const result = await operation();

        // Reset circuit breaker on success
        if (resilience.enableCircuitBreaker) {
          this.getCircuitBreaker(operationId, resilience).recordSuccess();
        }

        return result;
      } catch (error) {
        lastError = error as Error;

        // Record failure in circuit breaker
        if (resilience.enableCircuitBreaker) {
          this.getCircuitBreaker(operationId, resilience).recordFailure();
        }

        // Check if we should retry
        const shouldRetry = attempt < config.maxAttempts &&
                           config.retryCondition?.(lastError);

        if (!shouldRetry) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffFactor, attempt - 1),
          config.maxDelay
        );

        console.warn(`Operation ${operationId} failed (attempt ${attempt}/${config.maxAttempts}), retrying in ${delay}ms:`, lastError.message);

        await this.delay(delay);
      }
    }

    // If we get here, all retries failed
    throw lastError;
  }

  // Create a resilient version of a function
  createResilientFunction<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    operationId: string,
    retryConfig?: Partial<RetryConfig>,
    resilienceConfig?: Partial<ResilienceConfig>
  ): (...args: T) => Promise<R> {
    return (...args: T) => {
      return this.executeWithResilience(
        () => fn(...args),
        operationId,
        retryConfig,
        resilienceConfig
      );
    };
  }

  // Fallback UI state management
  createFallbackState<T>(
    primaryData: T | null,
    fallbackData: T,
    isLoading: boolean,
    error: Error | null
  ): {
    data: T;
    isUsingFallback: boolean;
    status: 'loading' | 'success' | 'fallback' | 'error';
  } {
    if (isLoading) {
      return {
        data: fallbackData,
        isUsingFallback: true,
        status: 'loading'
      };
    }

    if (error && primaryData === null) {
      return {
        data: fallbackData,
        isUsingFallback: true,
        status: 'fallback'
      };
    }

    if (primaryData !== null) {
      return {
        data: primaryData,
        isUsingFallback: false,
        status: 'success'
      };
    }

    return {
      data: fallbackData,
      isUsingFallback: true,
      status: 'error'
    };
  }

  private getCircuitBreaker(operationId: string, config: ResilienceConfig): CircuitBreaker {
    if (!this.circuitBreakers.has(operationId)) {
      this.circuitBreakers.set(
        operationId,
        new CircuitBreaker(config.circuitBreakerThreshold, config.circuitBreakerTimeout)
      );
    }
    return this.circuitBreakers.get(operationId)!;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Circuit Breaker implementation
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private threshold: number,
    private timeout: number
  ) {}

  isOpen(): boolean {
    if (this.state === 'closed') {
      return false;
    }

    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open';
        return false;
      }
      return true;
    }

    // Half-open: allow one request through
    return false;
  }

  recordSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }

  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.threshold) {
      this.state = 'open';
    }
  }
}

// Error boundary component for React
import React, { Component, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ResilienceErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by ResilienceErrorBoundary:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="error-boundary-fallback p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-lg font-semibold text-red-800 mb-2">
            Something went wrong
          </h3>
          <p className="text-red-600 mb-4">
            We're experiencing technical difficulties. Please try refreshing the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for resilient data fetching
import { useState, useEffect, useCallback } from 'react';

export function useResilientQuery<T>(
  queryFn: () => Promise<T>,
  operationId: string,
  options: {
    retryConfig?: Partial<RetryConfig>;
    resilienceConfig?: Partial<ResilienceConfig>;
    fallbackData?: T;
  } = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const resilienceManager = new ErrorResilienceManager();

  const executeQuery = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await resilienceManager.executeWithResilience(
        queryFn,
        operationId,
        options.retryConfig,
        options.resilienceConfig
      );
      setData(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [queryFn, operationId, options]);

  useEffect(() => {
    executeQuery();
  }, [executeQuery]);

  const fallbackState = resilienceManager.createFallbackState(
    data,
    options.fallbackData || null,
    isLoading,
    error
  );

  return {
    ...fallbackState,
    error,
    refetch: executeQuery
  };
}

// Global error handler
export class GlobalErrorHandler {
  private static instance: GlobalErrorHandler;
  private errorListeners: ((error: Error, context?: any) => void)[] = [];

  static getInstance(): GlobalErrorHandler {
    if (!GlobalErrorHandler.instance) {
      GlobalErrorHandler.instance = new GlobalErrorHandler();
    }
    return GlobalErrorHandler.instance;
  }

  addErrorListener(listener: (error: Error, context?: any) => void): void {
    this.errorListeners.push(listener);
  }

  removeErrorListener(listener: (error: Error, context?: any) => void): void {
    this.errorListeners = this.errorListeners.filter(l => l !== listener);
  }

  handleError(error: Error, context?: any): void {
    console.error('Global error handler:', error, context);

    // Notify all listeners
    this.errorListeners.forEach(listener => {
      try {
        listener(error, context);
      } catch (listenerError) {
        console.error('Error in error listener:', listenerError);
      }
    });

    // Send to performance monitoring
    if (typeof window !== 'undefined') {
      import('./performanceBenchmarker').then(({ performanceBenchmarker }) => {
        performanceBenchmarker.recordError(error, context);
      });
    }
  }

  // Setup global error handlers
  setupGlobalHandlers(): void {
    if (typeof window === 'undefined') return;

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(new Error(`Unhandled promise rejection: ${event.reason}`), {
        type: 'unhandledrejection',
        reason: event.reason
      });
    });

    // Handle uncaught errors
    window.addEventListener('error', (event) => {
      this.handleError(event.error || new Error(event.message), {
        type: 'uncaughterror',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });
  }
}

// Initialize global error handling
if (typeof window !== 'undefined') {
  GlobalErrorHandler.getInstance().setupGlobalHandlers();
}

export const globalErrorHandler = GlobalErrorHandler.getInstance();