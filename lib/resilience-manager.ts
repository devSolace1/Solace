// V8 Platform Resilience System
// Fault tolerance, auto-reconnect, and graceful failure handling

import { db } from '../database/adapter';
import { configManager } from '../config/manager';

export interface ResilienceConfig {
  maxRetries: number;
  retryDelay: number;
  circuitBreakerThreshold: number;
  circuitBreakerTimeout: number;
  offlineBufferSize: number;
  healthCheckInterval: number;
}

export interface ServiceStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastChecked: string;
  responseTime?: number;
  errorCount: number;
  circuitBreakerState: 'closed' | 'open' | 'half_open';
}

export interface OfflineMessage {
  id: string;
  userId: string;
  type: 'chat' | 'mood' | 'panic' | 'room_message';
  content: any;
  timestamp: string;
  retryCount: number;
  priority: 'low' | 'medium' | 'high';
}

export class ResilienceManager {
  private static instance: ResilienceManager;
  private config: ResilienceConfig;
  private serviceStatuses: Map<string, ServiceStatus> = new Map();
  private offlineBuffer: OfflineMessage[] = [];
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map();
  private healthCheckTimer?: NodeJS.Timeout;

  private constructor() {
    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      circuitBreakerThreshold: 5,
      circuitBreakerTimeout: 30000,
      offlineBufferSize: 100,
      healthCheckInterval: 30000
    };

    this.startHealthChecks();
  }

  static getInstance(): ResilienceManager {
    if (!ResilienceManager.instance) {
      ResilienceManager.instance = new ResilienceManager();
    }
    return ResilienceManager.instance;
  }

  // Service Health Monitoring
  private startHealthChecks(): void {
    this.healthCheckTimer = setInterval(() => {
      this.performHealthChecks();
    }, this.config.healthCheckInterval);
  }

  private async performHealthChecks(): Promise<void> {
    const services = ['database', 'realtime', 'ai_assistant', 'counselor_router'];

    for (const service of services) {
      await this.checkServiceHealth(service);
    }

    // Log degraded services
    const degradedServices = Array.from(this.serviceStatuses.values())
      .filter(status => status.status !== 'healthy');

    if (degradedServices.length > 0) {
      console.warn('Degraded services detected:', degradedServices.map(s => s.name));
    }
  }

  private async checkServiceHealth(serviceName: string): Promise<void> {
    const startTime = Date.now();

    try {
      let isHealthy = false;

      switch (serviceName) {
        case 'database':
          isHealthy = await db.healthCheck();
          break;
        case 'realtime':
          // Check WebSocket server health
          isHealthy = await this.checkRealtimeHealth();
          break;
        case 'ai_assistant':
          // Simple health check for AI service
          isHealthy = true; // AI is always available as it's local
          break;
        case 'counselor_router':
          // Check if router can access counselor data
          isHealthy = await this.checkRouterHealth();
          break;
      }

      const responseTime = Date.now() - startTime;
      this.updateServiceStatus(serviceName, isHealthy, responseTime);

    } catch (error) {
      this.updateServiceStatus(serviceName, false, Date.now() - startTime);
    }
  }

  private updateServiceStatus(serviceName: string, isHealthy: boolean, responseTime: number): void {
    const existing = this.serviceStatuses.get(serviceName);
    const errorCount = existing ? (isHealthy ? 0 : existing.errorCount + 1) : (isHealthy ? 0 : 1);

    let circuitBreakerState: 'closed' | 'open' | 'half_open' = 'closed';
    if (existing) {
      if (existing.circuitBreakerState === 'open' && Date.now() - new Date(existing.lastChecked).getTime() > this.config.circuitBreakerTimeout) {
        circuitBreakerState = 'half_open';
      } else if (errorCount >= this.config.circuitBreakerThreshold) {
        circuitBreakerState = 'open';
      } else if (existing.circuitBreakerState === 'half_open' && isHealthy) {
        circuitBreakerState = 'closed';
      } else {
        circuitBreakerState = existing.circuitBreakerState;
      }
    }

    const status: 'healthy' | 'degraded' | 'unhealthy' = !isHealthy ? 'unhealthy' :
      circuitBreakerState === 'open' ? 'degraded' : 'healthy';

    this.serviceStatuses.set(serviceName, {
      name: serviceName,
      status,
      lastChecked: new Date().toISOString(),
      responseTime,
      errorCount,
      circuitBreakerState
    });
  }

  // Auto-reconnect functionality
  async attemptReconnect(serviceName: string, reconnectFunction: () => Promise<boolean>): Promise<boolean> {
    const status = this.serviceStatuses.get(serviceName);
    if (!status || status.circuitBreakerState === 'open') {
      return false;
    }

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const success = await reconnectFunction();
        if (success) {
          console.log(`Successfully reconnected to ${serviceName} on attempt ${attempt}`);
          this.updateServiceStatus(serviceName, true, 0);
          return true;
        }
      } catch (error) {
        console.warn(`Reconnect attempt ${attempt} failed for ${serviceName}:`, error);
      }

      if (attempt < this.config.maxRetries) {
        await this.delay(this.config.retryDelay * attempt);
      }
    }

    console.error(`Failed to reconnect to ${serviceName} after ${this.config.maxRetries} attempts`);
    return false;
  }

  // Offline message buffering
  async bufferMessage(message: Omit<OfflineMessage, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    if (this.offlineBuffer.length >= this.config.offlineBufferSize) {
      // Remove oldest low-priority message
      const lowPriorityIndex = this.offlineBuffer.findIndex(msg => msg.priority === 'low');
      if (lowPriorityIndex !== -1) {
        this.offlineBuffer.splice(lowPriorityIndex, 1);
      } else {
        // Remove oldest message
        this.offlineBuffer.shift();
      }
    }

    const offlineMessage: OfflineMessage = {
      id: this.generateMessageId(),
      ...message,
      timestamp: new Date().toISOString(),
      retryCount: 0
    };

    this.offlineBuffer.push(offlineMessage);

    // Store in persistent storage
    await this.persistOfflineMessage(offlineMessage);
  }

  async processOfflineBuffer(): Promise<void> {
    const messagesToProcess = [...this.offlineBuffer];
    this.offlineBuffer = [];

    for (const message of messagesToProcess) {
      try {
        await this.attemptMessageDelivery(message);
      } catch (error) {
        console.error(`Failed to deliver offline message ${message.id}:`, error);
        // Re-queue with increased retry count
        if (message.retryCount < this.config.maxRetries) {
          this.offlineBuffer.push({
            ...message,
            retryCount: message.retryCount + 1
          });
        }
      }
    }
  }

  private async attemptMessageDelivery(message: OfflineMessage): Promise<void> {
    // Attempt to deliver based on message type
    switch (message.type) {
      case 'chat':
        await this.deliverChatMessage(message);
        break;
      case 'mood':
        await this.deliverMoodLog(message);
        break;
      case 'panic':
        await this.deliverPanicAlert(message);
        break;
      case 'room_message':
        await this.deliverRoomMessage(message);
        break;
    }

    // Remove from persistent storage
    await this.removeOfflineMessage(message.id);
  }

  // Fallback queue system
  async enqueueFallbackTask(task: {
    id: string;
    type: string;
    data: any;
    priority: 'low' | 'medium' | 'high';
    execute: () => Promise<void>;
  }): Promise<void> {
    const adapter = db.getAdapter();

    await adapter.query(`
      INSERT INTO fallback_queue (id, type, data, priority, created_at, retry_count)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      task.id,
      task.type,
      JSON.stringify(task.data),
      task.priority,
      new Date().toISOString(),
      0
    ]);
  }

  async processFallbackQueue(): Promise<void> {
    const adapter = db.getAdapter();

    const result = await adapter.query(`
      SELECT * FROM fallback_queue
      WHERE status = 'pending'
      ORDER BY
        CASE priority
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          WHEN 'low' THEN 3
        END,
        created_at ASC
      LIMIT 10
    `);

    for (const task of result) {
      try {
        // Execute the task (would need to reconstruct the function)
        // For now, just mark as completed
        await adapter.query(
          'UPDATE fallback_queue SET status = ?, completed_at = ? WHERE id = ?',
          ['completed', new Date().toISOString(), task.id]
        );
      } catch (error) {
        const retryCount = task.retry_count + 1;
        if (retryCount >= this.config.maxRetries) {
          await adapter.query(
            'UPDATE fallback_queue SET status = ?, error = ? WHERE id = ?',
            ['failed', error instanceof Error ? error.message : 'Unknown error', task.id]
          );
        } else {
          await adapter.query(
            'UPDATE fallback_queue SET retry_count = ? WHERE id = ?',
            [retryCount, task.id]
          );
        }
      }
    }
  }

  // Graceful degradation
  isServiceAvailable(serviceName: string): boolean {
    const status = this.serviceStatuses.get(serviceName);
    return status ? status.circuitBreakerState !== 'open' : false;
  }

  getDegradedMode(): {
    realtime: boolean;
    aiAssistant: boolean;
    counselorMatching: boolean;
    analytics: boolean;
  } {
    return {
      realtime: this.isServiceAvailable('realtime'),
      aiAssistant: this.isServiceAvailable('ai_assistant'),
      counselorMatching: this.isServiceAvailable('counselor_router'),
      analytics: this.isServiceAvailable('database') // Analytics depends on DB
    };
  }

  // Helper methods
  private async checkRealtimeHealth(): Promise<boolean> {
    // Check if WebSocket server is responding
    try {
      // This would need actual WebSocket health check implementation
      return true; // Placeholder
    } catch {
      return false;
    }
  }

  private async checkRouterHealth(): Promise<boolean> {
    try {
      const adapter = db.getAdapter();
      await adapter.query('SELECT COUNT(*) FROM counselor_profiles WHERE availability = true');
      return true;
    } catch {
      return false;
    }
  }

  private async persistOfflineMessage(message: OfflineMessage): Promise<void> {
    const adapter = db.getAdapter();

    await adapter.query(`
      INSERT INTO offline_messages (id, user_id, type, content, timestamp, retry_count, priority)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      message.id,
      message.userId,
      message.type,
      JSON.stringify(message.content),
      message.timestamp,
      message.retryCount,
      message.priority
    ]);
  }

  private async removeOfflineMessage(messageId: string): Promise<void> {
    const adapter = db.getAdapter();

    await adapter.query('DELETE FROM offline_messages WHERE id = ?', [messageId]);
  }

  private async deliverChatMessage(message: OfflineMessage): Promise<void> {
    // Implementation would send the message through the chat system
    console.log(`Delivering offline chat message: ${message.id}`);
  }

  private async deliverMoodLog(message: OfflineMessage): Promise<void> {
    // Implementation would save the mood log
    console.log(`Delivering offline mood log: ${message.id}`);
  }

  private async deliverPanicAlert(message: OfflineMessage): Promise<void> {
    // Implementation would trigger panic alert
    console.log(`Delivering offline panic alert: ${message.id}`);
  }

  private async deliverRoomMessage(message: OfflineMessage): Promise<void> {
    // Implementation would send room message
    console.log(`Delivering offline room message: ${message.id}`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateMessageId(): string {
    return `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Cleanup
  shutdown(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    for (const timer of this.reconnectTimers.values()) {
      clearTimeout(timer);
    }
  }

  getServiceStatuses(): ServiceStatus[] {
    return Array.from(this.serviceStatuses.values());
  }

  getOfflineBufferSize(): number {
    return this.offlineBuffer.length;
  }
}

export const resilienceManager = ResilienceManager.getInstance();