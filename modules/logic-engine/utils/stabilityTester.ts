'use client';

// V6 Stability Testing Framework
// Automated tests for concurrent sessions, panic alerts, and system stability

export interface StabilityTestConfig {
  duration: number; // Test duration in milliseconds
  concurrentUsers: number; // Number of simulated users
  messageFrequency: number; // Messages per minute per user
  panicAlertFrequency: number; // Panic alerts per hour
  sessionDropoutRate: number; // Percentage of users who drop sessions
  networkLatency: number; // Simulated network latency in ms
  enableRealtime: boolean; // Whether to test realtime features
}

export interface StabilityTestResult {
  testId: string;
  startTime: Date;
  endTime: Date;
  config: StabilityTestConfig;
  metrics: {
    totalMessages: number;
    totalSessions: number;
    totalPanicAlerts: number;
    averageResponseTime: number;
    errorCount: number;
    connectionDrops: number;
    memoryUsage: number[];
    cpuUsage: number[];
  };
  errors: Array<{
    timestamp: Date;
    error: string;
    context: any;
  }>;
  passed: boolean;
  recommendations: string[];
}

export class StabilityTester {
  private activeTests: Map<string, StabilityTest> = new Map();
  private testResults: StabilityTestResult[] = [];

  // Run a comprehensive stability test
  async runStabilityTest(config: StabilityTestConfig): Promise<StabilityTestResult> {
    const testId = `stability-test-${Date.now()}`;
    const test = new StabilityTest(testId, config);

    this.activeTests.set(testId, test);

    try {
      const result = await test.run();
      this.testResults.push(result);
      return result;
    } finally {
      this.activeTests.delete(testId);
    }
  }

  // Run specific test scenarios
  async runConcurrentChatTest(userCount: number, duration: number): Promise<StabilityTestResult> {
    return this.runStabilityTest({
      duration,
      concurrentUsers: userCount,
      messageFrequency: 10, // 10 messages per minute
      panicAlertFrequency: 0, // No panic alerts
      sessionDropoutRate: 0.1, // 10% dropout rate
      networkLatency: 50,
      enableRealtime: true
    });
  }

  async runPanicAlertTest(alertCount: number, duration: number): Promise<StabilityTestResult> {
    return this.runStabilityTest({
      duration,
      concurrentUsers: Math.ceil(alertCount / 10), // Spread alerts across users
      messageFrequency: 5,
      panicAlertFrequency: (alertCount * 60 * 60) / duration, // Convert to per hour
      sessionDropoutRate: 0.05,
      networkLatency: 100,
      enableRealtime: true
    });
  }

  async runRealtimeStressTest(connectionCount: number, duration: number): Promise<StabilityTestResult> {
    return this.runStabilityTest({
      duration,
      concurrentUsers: connectionCount,
      messageFrequency: 1, // Minimal messaging
      panicAlertFrequency: 0,
      sessionDropoutRate: 0.02,
      networkLatency: 20,
      enableRealtime: true
    });
  }

  // Get test results and analytics
  getTestResults(limit: number = 10): StabilityTestResult[] {
    return this.testResults.slice(-limit);
  }

  getTestAnalytics(): {
    averagePerformance: Partial<StabilityTestResult['metrics']>;
    failureRate: number;
    commonErrors: Array<{ error: string; count: number }>;
    recommendations: string[];
  } {
    if (this.testResults.length === 0) {
      return {
        averagePerformance: {},
        failureRate: 0,
        commonErrors: [],
        recommendations: []
      };
    }

    const passedTests = this.testResults.filter(t => t.passed);
    const failureRate = 1 - (passedTests.length / this.testResults.length);

    // Calculate averages
    const averagePerformance = this.testResults.reduce((acc, test) => {
      acc.totalMessages = (acc.totalMessages || 0) + test.metrics.totalMessages;
      acc.totalSessions = (acc.totalSessions || 0) + test.metrics.totalSessions;
      acc.totalPanicAlerts = (acc.totalPanicAlerts || 0) + test.metrics.totalPanicAlerts;
      acc.averageResponseTime = (acc.averageResponseTime || 0) + test.metrics.averageResponseTime;
      acc.errorCount = (acc.errorCount || 0) + test.metrics.errorCount;
      acc.connectionDrops = (acc.connectionDrops || 0) + test.metrics.connectionDrops;
      return acc;
    }, {} as any);

    Object.keys(averagePerformance).forEach(key => {
      averagePerformance[key] = averagePerformance[key] / this.testResults.length;
    });

    // Find common errors
    const errorCounts: Record<string, number> = {};
    this.testResults.forEach(test => {
      test.errors.forEach(err => {
        errorCounts[err.error] = (errorCounts[err.error] || 0) + 1;
      });
    });

    const commonErrors = Object.entries(errorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([error, count]) => ({ error, count }));

    // Generate recommendations
    const recommendations: string[] = [];

    if (failureRate > 0.1) {
      recommendations.push('High failure rate detected. Consider improving error handling.');
    }

    if (averagePerformance.averageResponseTime > 5000) {
      recommendations.push('High response times detected. Consider optimizing database queries.');
    }

    if (averagePerformance.connectionDrops > averagePerformance.totalSessions * 0.05) {
      recommendations.push('High connection drop rate. Consider improving realtime stability.');
    }

    if (averagePerformance.errorCount > 10) {
      recommendations.push('High error count. Review error resilience implementation.');
    }

    return {
      averagePerformance,
      failureRate,
      commonErrors,
      recommendations
    };
  }

  // Stop all active tests
  stopAllTests(): void {
    this.activeTests.forEach(test => test.stop());
    this.activeTests.clear();
  }
}

class StabilityTest {
  private isRunning = false;
  private startTime: Date;
  private endTime: Date;
  private metrics = {
    totalMessages: 0,
    totalSessions: 0,
    totalPanicAlerts: 0,
    averageResponseTime: 0,
    errorCount: 0,
    connectionDrops: 0,
    memoryUsage: [] as number[],
    cpuUsage: [] as number[]
  };
  private errors: StabilityTestResult['errors'] = [];
  private responseTimes: number[] = [];

  constructor(
    private testId: string,
    private config: StabilityTestConfig
  ) {}

  async run(): Promise<StabilityTestResult> {
    this.isRunning = true;
    this.startTime = new Date();

    console.log(`Starting stability test: ${this.testId}`, this.config);

    try {
      // Initialize test environment
      await this.initializeTest();

      // Run test scenarios
      const testPromises = [
        this.simulateUserSessions(),
        this.simulatePanicAlerts(),
        this.monitorSystemResources(),
        this.simulateNetworkConditions()
      ];

      // Run all scenarios concurrently
      await Promise.allSettled(testPromises);

      // Calculate final metrics
      this.calculateFinalMetrics();

      this.endTime = new Date();

      const passed = this.evaluateTestSuccess();
      const recommendations = this.generateRecommendations();

      const result: StabilityTestResult = {
        testId: this.testId,
        startTime: this.startTime,
        endTime: this.endTime,
        config: this.config,
        metrics: this.metrics,
        errors: this.errors,
        passed,
        recommendations
      };

      console.log(`Stability test completed: ${this.testId}`, result);
      return result;

    } catch (error) {
      console.error(`Stability test failed: ${this.testId}`, error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  stop(): void {
    this.isRunning = false;
  }

  private async initializeTest(): Promise<void> {
    // Simulate test environment setup
    await this.delay(1000);
  }

  private async simulateUserSessions(): Promise<void> {
    const users = Array.from({ length: this.config.concurrentUsers }, (_, i) => ({
      id: `user-${i}`,
      sessionId: `session-${i}`,
      messageCount: 0,
      connected: true,
      lastActivity: Date.now()
    }));

    const messageInterval = (60 / this.config.messageFrequency) * 1000; // ms between messages

    const startTime = Date.now();

    while (this.isRunning && Date.now() - startTime < this.config.duration) {
      // Simulate user activity
      users.forEach(user => {
        if (user.connected && Math.random() < (this.config.messageFrequency / 60)) { // Probability per second
          this.simulateMessage(user);
        }

        // Simulate session dropout
        if (Math.random() < (this.config.sessionDropoutRate / 3600)) { // Per second rate
          user.connected = false;
          this.metrics.connectionDrops++;
        }
      });

      await this.delay(1000); // Check every second
    }

    this.metrics.totalSessions = users.filter(u => u.connected).length;
  }

  private async simulatePanicAlerts(): Promise<void> {
    const alertsPerSecond = this.config.panicAlertFrequency / 3600;
    let alertCount = 0;

    const startTime = Date.now();

    while (this.isRunning && Date.now() - startTime < this.config.duration) {
      if (Math.random() < alertsPerSecond) {
        await this.simulatePanicAlert(++alertCount);
      }

      await this.delay(1000);
    }
  }

  private async monitorSystemResources(): Promise<void> {
    const startTime = Date.now();

    while (this.isRunning && Date.now() - startTime < this.config.duration) {
      // Simulate memory and CPU monitoring
      const memoryUsage = 0.3 + Math.random() * 0.4; // 30-70% memory usage
      const cpuUsage = 0.1 + Math.random() * 0.3; // 10-40% CPU usage

      this.metrics.memoryUsage.push(memoryUsage);
      this.metrics.cpuUsage.push(cpuUsage);

      await this.delay(5000); // Monitor every 5 seconds
    }
  }

  private async simulateNetworkConditions(): Promise<void> {
    // Simulate network latency and occasional failures
    const startTime = Date.now();

    while (this.isRunning && Date.now() - startTime < this.config.duration) {
      // Random network hiccups
      if (Math.random() < 0.01) { // 1% chance per second
        await this.delay(this.config.networkLatency * 5); // 5x normal latency
        this.recordError('Network latency spike', { latency: this.config.networkLatency * 5 });
      }

      await this.delay(1000);
    }
  }

  private async simulateMessage(user: any): Promise<void> {
    const startTime = performance.now();

    try {
      // Simulate message sending with network latency
      await this.delay(this.config.networkLatency);

      // Simulate occasional failures
      if (Math.random() < 0.02) { // 2% failure rate
        throw new Error('Message send failed');
      }

      user.messageCount++;
      this.metrics.totalMessages++;

      const responseTime = performance.now() - startTime;
      this.responseTimes.push(responseTime);

    } catch (error) {
      this.recordError('Message send error', { userId: user.id, error: error.message });
    }
  }

  private async simulatePanicAlert(alertNumber: number): Promise<void> {
    try {
      // Simulate panic alert processing
      await this.delay(this.config.networkLatency * 2); // Extra latency for critical operations

      if (Math.random() < 0.05) { // 5% failure rate for panic alerts
        throw new Error('Panic alert processing failed');
      }

      this.metrics.totalPanicAlerts++;

    } catch (error) {
      this.recordError('Panic alert error', { alertNumber, error: error.message });
    }
  }

  private calculateFinalMetrics(): void {
    if (this.responseTimes.length > 0) {
      this.metrics.averageResponseTime =
        this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length;
    }
  }

  private evaluateTestSuccess(): boolean {
    const errorRate = this.errors.length / Math.max(this.metrics.totalMessages + this.metrics.totalPanicAlerts, 1);
    const connectionDropRate = this.metrics.connectionDrops / Math.max(this.metrics.totalSessions, 1);

    // Test passes if error rate < 5% and connection drop rate < 10%
    return errorRate < 0.05 && connectionDropRate < 0.1;
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.metrics.averageResponseTime > 3000) {
      recommendations.push('Consider optimizing message processing latency');
    }

    if (this.metrics.connectionDrops > this.config.concurrentUsers * 0.05) {
      recommendations.push('High connection drop rate - review realtime connection handling');
    }

    if (this.errors.length > this.config.concurrentUsers) {
      recommendations.push('High error count - implement better error resilience');
    }

    if (this.metrics.memoryUsage.some(m => m > 0.8)) {
      recommendations.push('High memory usage detected - consider memory optimizations');
    }

    return recommendations;
  }

  private recordError(error: string, context: any): void {
    this.errors.push({
      timestamp: new Date(),
      error,
      context
    });
    this.metrics.errorCount++;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// React hook for stability testing
import { useState, useCallback } from 'react';

export function useStabilityTesting() {
  const [isRunning, setIsRunning] = useState(false);
  const [currentResult, setCurrentResult] = useState<StabilityTestResult | null>(null);
  const [analytics, setAnalytics] = useState<ReturnType<StabilityTester['getTestAnalytics']> | null>(null);

  const tester = new StabilityTester();

  const runTest = useCallback(async (config: StabilityTestConfig) => {
    setIsRunning(true);
    try {
      const result = await tester.runStabilityTest(config);
      setCurrentResult(result);
      setAnalytics(tester.getTestAnalytics());
      return result;
    } finally {
      setIsRunning(false);
    }
  }, []);

  const runConcurrentChatTest = useCallback(async (userCount: number, duration: number) => {
    return runTest({
      duration,
      concurrentUsers: userCount,
      messageFrequency: 10,
      panicAlertFrequency: 0,
      sessionDropoutRate: 0.1,
      networkLatency: 50,
      enableRealtime: true
    });
  }, [runTest]);

  const runPanicAlertTest = useCallback(async (alertCount: number, duration: number) => {
    return runTest({
      duration,
      concurrentUsers: Math.ceil(alertCount / 10),
      messageFrequency: 5,
      panicAlertFrequency: (alertCount * 60 * 60) / duration,
      sessionDropoutRate: 0.05,
      networkLatency: 100,
      enableRealtime: true
    });
  }, [runTest]);

  const getAnalytics = useCallback(() => {
    return tester.getTestAnalytics();
  }, []);

  return {
    isRunning,
    currentResult,
    analytics,
    runTest,
    runConcurrentChatTest,
    runPanicAlertTest,
    getAnalytics
  };
}

export const stabilityTester = new StabilityTester();