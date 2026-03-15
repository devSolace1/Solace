'use client';

// V6 Performance Benchmarking Utility
// Tracks and monitors system performance metrics

export interface PerformanceMetrics {
  chatLatency: number;
  databaseQueryTime: number;
  dashboardLoadTime: number;
  realtimeConnectionStability: number;
  memoryUsage: number;
  errorRate: number;
}

export interface BenchmarkResult {
  metric: keyof PerformanceMetrics;
  value: number;
  timestamp: Date;
  context?: Record<string, any>;
}

class PerformanceBenchmarker {
  private metrics: BenchmarkResult[] = [];
  private isEnabled = process.env.NODE_ENV === 'development';

  // Chat Performance Tracking
  async measureChatLatency(sessionId: string, messageCount: number = 1): Promise<number> {
    if (!this.isEnabled) return 0;

    const startTime = performance.now();

    try {
      // Simulate message send/receive cycle
      await this.simulateMessageCycle(sessionId, messageCount);
    } catch (error) {
      console.warn('Chat latency measurement failed:', error);
    }

    const latency = performance.now() - startTime;
    this.recordMetric('chatLatency', latency, { sessionId, messageCount });

    return latency;
  }

  // Database Query Performance
  async measureDatabaseQuery(queryType: string, queryFn: () => Promise<any>): Promise<number> {
    if (!this.isEnabled) return 0;

    const startTime = performance.now();

    try {
      await queryFn();
    } catch (error) {
      console.warn('Database query measurement failed:', error);
      this.recordMetric('errorRate', 1, { queryType, error: (error as Error).message });
    }

    const queryTime = performance.now() - startTime;
    this.recordMetric('databaseQueryTime', queryTime, { queryType });

    return queryTime;
  }

  // Dashboard Load Time
  measureDashboardLoad(dashboardType: string): number {
    if (!this.isEnabled) return 0;

    const loadTime = performance.now() - (window as any).dashboardStartTime;
    this.recordMetric('dashboardLoadTime', loadTime, { dashboardType });

    return loadTime;
  }

  // Realtime Connection Stability
  async measureRealtimeStability(sessionId: string, duration: number = 30000): Promise<number> {
    if (!this.isEnabled) return 1;

    let connectionDrops = 0;
    let totalChecks = 0;
    const checkInterval = 1000; // Check every second

    return new Promise((resolve) => {
      const interval = setInterval(() => {
        totalChecks++;
        // Simulate connection check
        const isConnected = Math.random() > 0.05; // 95% uptime simulation

        if (!isConnected) {
          connectionDrops++;
        }

        if (totalChecks * checkInterval >= duration) {
          clearInterval(interval);
          const stability = 1 - (connectionDrops / totalChecks);
          this.recordMetric('realtimeConnectionStability', stability, { sessionId, duration });
          resolve(stability);
        }
      }, checkInterval);
    });
  }

  // Memory Usage Tracking
  measureMemoryUsage(): number {
    if (!this.isEnabled || !(window as any).performance.memory) return 0;

    const memoryInfo = (window as any).performance.memory;
    const memoryUsage = memoryInfo.usedJSHeapSize / memoryInfo.totalJSHeapSize;

    this.recordMetric('memoryUsage', memoryUsage);
    return memoryUsage;
  }

  // Error Rate Tracking
  recordError(error: Error, context?: Record<string, any>): void {
    if (!this.isEnabled) return;

    this.recordMetric('errorRate', 1, {
      error: error.message,
      stack: error.stack,
      ...context
    });
  }

  // Comprehensive System Health Check
  async runSystemHealthCheck(): Promise<PerformanceMetrics> {
    const metrics: Partial<PerformanceMetrics> = {};

    // Run all measurements concurrently
    const measurements = await Promise.allSettled([
      this.measureChatLatency('health-check-session'),
      this.measureDatabaseQuery('health-check', async () => {
        // Simulate a simple query
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
      }),
      this.measureRealtimeStability('health-check-session', 5000),
    ]);

    metrics.chatLatency = measurements[0].status === 'fulfilled' ? measurements[0].value : 0;
    metrics.databaseQueryTime = measurements[1].status === 'fulfilled' ? measurements[1].value : 0;
    metrics.realtimeConnectionStability = measurements[2].status === 'fulfilled' ? measurements[2].value : 0;

    metrics.dashboardLoadTime = this.measureDashboardLoad('health-check');
    metrics.memoryUsage = this.measureMemoryUsage();
    metrics.errorRate = this.getErrorRate();

    return metrics as PerformanceMetrics;
  }

  // Get aggregated metrics
  getAggregatedMetrics(timeRange: number = 3600000): { // 1 hour default
    averages: Partial<PerformanceMetrics>;
    peaks: Partial<PerformanceMetrics>;
    trends: Record<string, 'improving' | 'degrading' | 'stable'>;
  } {
    const cutoff = Date.now() - timeRange;
    const recentMetrics = this.metrics.filter(m => m.timestamp.getTime() > cutoff);

    const averages: Partial<PerformanceMetrics> = {};
    const peaks: Partial<PerformanceMetrics> = {};
    const trends: Record<string, 'improving' | 'degrading' | 'stable'> = {};

    // Group metrics by type
    const grouped = recentMetrics.reduce((acc, metric) => {
      if (!acc[metric.metric]) acc[metric.metric] = [];
      acc[metric.metric].push(metric);
      return acc;
    }, {} as Record<string, BenchmarkResult[]>);

    // Calculate averages and peaks
    Object.entries(grouped).forEach(([metric, values]) => {
      const numericValues = values.map(v => v.value).filter(v => !isNaN(v));

      if (numericValues.length > 0) {
        averages[metric as keyof PerformanceMetrics] = numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length;
        peaks[metric as keyof PerformanceMetrics] = Math.max(...numericValues);
      }

      // Calculate trend (simple: compare first half vs second half)
      if (values.length >= 6) {
        const midpoint = Math.floor(values.length / 2);
        const firstHalf = values.slice(0, midpoint);
        const secondHalf = values.slice(midpoint);

        const firstAvg = firstHalf.reduce((sum, v) => sum + v.value, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, v) => sum + v.value, 0) / secondHalf.length;

        const change = (secondAvg - firstAvg) / firstAvg;

        if (Math.abs(change) < 0.05) {
          trends[metric] = 'stable';
        } else if (change > 0) {
          trends[metric] = metric === 'errorRate' ? 'degrading' : 'degrading'; // Higher values are worse for most metrics
        } else {
          trends[metric] = metric === 'errorRate' ? 'improving' : 'improving';
        }
      } else {
        trends[metric] = 'stable';
      }
    });

    return { averages, peaks, trends };
  }

  // Export metrics for analysis
  exportMetrics(): BenchmarkResult[] {
    return [...this.metrics];
  }

  // Clear old metrics
  cleanup(maxAge: number = 86400000): void { // 24 hours default
    const cutoff = Date.now() - maxAge;
    this.metrics = this.metrics.filter(m => m.timestamp.getTime() > cutoff);
  }

  private recordMetric(
    metric: keyof PerformanceMetrics,
    value: number,
    context?: Record<string, any>
  ): void {
    this.metrics.push({
      metric,
      value,
      timestamp: new Date(),
      context
    });

    // Keep only last 1000 metrics to prevent memory issues
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  private getErrorRate(): number {
    const recentMetrics = this.metrics.filter(m =>
      m.timestamp.getTime() > Date.now() - 3600000 // Last hour
    );

    const errorMetrics = recentMetrics.filter(m => m.metric === 'errorRate');
    const totalMetrics = recentMetrics.length;

    return totalMetrics > 0 ? errorMetrics.length / totalMetrics : 0;
  }

  private async simulateMessageCycle(sessionId: string, messageCount: number): Promise<void> {
    // Simulate network latency
    const baseLatency = 50 + Math.random() * 100; // 50-150ms base latency
    const messages = Array.from({ length: messageCount }, (_, i) => `Message ${i + 1}`);

    for (const message of messages) {
      // Simulate send
      await new Promise(resolve => setTimeout(resolve, baseLatency));

      // Simulate receive
      await new Promise(resolve => setTimeout(resolve, baseLatency * 0.5));
    }
  }
}

// Global instance
export const performanceBenchmarker = new PerformanceBenchmarker();

// React hook for component-level benchmarking
export function usePerformanceBenchmark() {
  const measureRenderTime = (componentName: string) => {
    const startTime = performance.now();

    return () => {
      const renderTime = performance.now() - startTime;
      performanceBenchmarker.recordMetric('dashboardLoadTime', renderTime, {
        component: componentName,
        type: 'render'
      });
    };
  };

  const measureInteraction = (interactionName: string) => {
    const startTime = performance.now();

    return () => {
      const interactionTime = performance.now() - startTime;
      performanceBenchmarker.recordMetric('dashboardLoadTime', interactionTime, {
        interaction: interactionName,
        type: 'interaction'
      });
    };
  };

  return {
    measureRenderTime,
    measureInteraction,
    recordError: performanceBenchmarker.recordError.bind(performanceBenchmarker)
  };
}

// Performance monitoring hook
export function usePerformanceMonitoring(enabled: boolean = true) {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);

  const startMonitoring = () => {
    if (!enabled) return;

    setIsMonitoring(true);

    const interval = setInterval(async () => {
      const currentMetrics = await performanceBenchmarker.runSystemHealthCheck();
      setMetrics(currentMetrics);
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  };

  const stopMonitoring = () => {
    setIsMonitoring(false);
  };

  useEffect(() => {
    if (enabled && !isMonitoring) {
      const cleanup = startMonitoring();
      return cleanup;
    }
  }, [enabled, isMonitoring]);

  return {
    metrics,
    isMonitoring,
    startMonitoring,
    stopMonitoring
  };
}