// V8 Enhanced Global Analytics Dashboard
// Anonymous activity patterns and platform insights

import { db } from '../database/adapter';
import { configManager } from '../config/manager';
import { distributedManager } from './distributed-manager';

export interface AnalyticsConfig {
  retentionDays: number;
  aggregationInterval: number; // minutes
  privacy: {
    anonymizeAfter: number; // hours
    aggregateOnly: boolean;
    excludePII: boolean;
  };
  alerts: {
    enabled: boolean;
    thresholds: {
      highPanicRate: number;
      lowCounselorAvailability: number;
      highSystemLoad: number;
    };
  };
}

export interface ActivityMetrics {
  timestamp: string;
  nodeId: string;
  activeUsers: number;
  activeCounselors: number;
  totalSessions: number;
  averageSessionDuration: number;
  panicAlerts: number;
  moodLogs: number;
  roomMessages: number;
  aiInteractions: number;
}

export interface UserJourneyMetrics {
  totalUsers: number;
  newUsersToday: number;
  returningUsers: number;
  averageSessionsPerUser: number;
  userRetention: {
    day1: number;
    day7: number;
    day30: number;
  };
  dropOffPoints: {
    registration: number;
    firstChat: number;
    firstMoodLog: number;
    week1: number;
  };
}

export interface EmotionalHealthMetrics {
  averageMoodScore: number;
  moodDistribution: { [key: number]: number };
  panicFrequency: number;
  recoveryRate: number;
  crisisInterventionSuccess: number;
  aiAssistanceUsage: number;
  counselorInterventionRate: number;
}

export interface PlatformPerformanceMetrics {
  averageResponseTime: number;
  systemUptime: number;
  errorRate: number;
  loadDistribution: { [nodeId: string]: number };
  federationHealth: number;
  dataSyncLatency: number;
}

export interface AlertCondition {
  id: string;
  type: 'panic_rate' | 'counselor_availability' | 'system_load' | 'error_rate';
  threshold: number;
  currentValue: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  triggered: boolean;
  lastTriggered?: string;
}

export class AnalyticsManager {
  private static instance: AnalyticsManager;
  private config: AnalyticsConfig;
  private aggregationTimer?: NodeJS.Timeout;
  private alertCheckTimer?: NodeJS.Timeout;

  private constructor() {
    this.config = {
      retentionDays: 90,
      aggregationInterval: 15, // 15 minutes
      privacy: {
        anonymizeAfter: 24, // 24 hours
        aggregateOnly: true,
        excludePII: true
      },
      alerts: {
        enabled: true,
        thresholds: {
          highPanicRate: 10, // per hour
          lowCounselorAvailability: 0.2, // 20% available
          highSystemLoad: 0.8 // 80% load
        }
      }
    };

    this.startAggregation();
    this.startAlertMonitoring();
  }

  static getInstance(): AnalyticsManager {
    if (!AnalyticsManager.instance) {
      AnalyticsManager.instance = new AnalyticsManager();
    }
    return AnalyticsManager.instance;
  }

  // Real-time Activity Aggregation
  private startAggregation(): void {
    this.aggregationTimer = setInterval(() => {
      this.aggregateMetrics();
    }, this.config.aggregationInterval * 60 * 1000);
  }

  private async aggregateMetrics(): Promise<void> {
    try {
      const now = new Date();
      const nodeId = distributedManager.getNodeConfig().nodeId;

      // Collect current metrics
      const metrics: ActivityMetrics = {
        timestamp: now.toISOString(),
        nodeId,
        activeUsers: await this.getActiveUserCount(),
        activeCounselors: await this.getActiveCounselorCount(),
        totalSessions: await this.getTotalSessions(),
        averageSessionDuration: await this.getAverageSessionDuration(),
        panicAlerts: await this.getPanicAlertsCount(),
        moodLogs: await this.getMoodLogsCount(),
        roomMessages: await this.getRoomMessagesCount(),
        aiInteractions: await this.getAIInteractionsCount()
      };

      // Store aggregated metrics
      await this.storeActivityMetrics(metrics);

      // Clean up old data
      await this.cleanupOldData();

    } catch (error) {
      console.error('Metrics aggregation failed:', error);
    }
  }

  private async getActiveUserCount(): Promise<number> {
    const adapter = db.getAdapter();
    const result = await adapter.query(`
      SELECT COUNT(*) as count FROM active_sessions
      WHERE last_activity > ?
    `, [new Date(Date.now() - 5 * 60 * 1000).toISOString()]);
    return result[0]?.count || 0;
  }

  private async getActiveCounselorCount(): Promise<number> {
    const adapter = db.getAdapter();
    const result = await adapter.query(`
      SELECT COUNT(*) as count FROM counselor_profiles
      WHERE availability = true AND last_active > ?
    `, [new Date(Date.now() - 10 * 60 * 1000).toISOString()]);
    return result[0]?.count || 0;
  }

  private async getTotalSessions(): Promise<number> {
    const adapter = db.getAdapter();
    const result = await adapter.query(`
      SELECT COUNT(*) as count FROM chat_sessions
      WHERE created_at > ?
    `, [new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()]);
    return result[0]?.count || 0;
  }

  private async getAverageSessionDuration(): Promise<number> {
    const adapter = db.getAdapter();
    const result = await adapter.query(`
      SELECT AVG(duration_minutes) as avg_duration FROM chat_sessions
      WHERE created_at > ? AND duration_minutes IS NOT NULL
    `, [new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()]);
    return result[0]?.avg_duration || 0;
  }

  private async getPanicAlertsCount(): Promise<number> {
    const adapter = db.getAdapter();
    const result = await adapter.query(`
      SELECT COUNT(*) as count FROM panic_alerts
      WHERE created_at > ?
    `, [new Date(Date.now() - 60 * 60 * 1000).toISOString()]);
    return result[0]?.count || 0;
  }

  private async getMoodLogsCount(): Promise<number> {
    const adapter = db.getAdapter();
    const result = await adapter.query(`
      SELECT COUNT(*) as count FROM mood_logs
      WHERE created_at > ?
    `, [new Date(Date.now() - 60 * 60 * 1000).toISOString()]);
    return result[0]?.count || 0;
  }

  private async getRoomMessagesCount(): Promise<number> {
    const adapter = db.getAdapter();
    const result = await adapter.query(`
      SELECT COUNT(*) as count FROM room_messages
      WHERE created_at > ?
    `, [new Date(Date.now() - 60 * 60 * 1000).toISOString()]);
    return result[0]?.count || 0;
  }

  private async getAIInteractionsCount(): Promise<number> {
    const adapter = db.getAdapter();
    const result = await adapter.query(`
      SELECT COUNT(*) as count FROM ai_interactions
      WHERE created_at > ?
    `, [new Date(Date.now() - 60 * 60 * 1000).toISOString()]);
    return result[0]?.count || 0;
  }

  private async storeActivityMetrics(metrics: ActivityMetrics): Promise<void> {
    const adapter = db.getAdapter();

    await adapter.query(`
      INSERT INTO activity_metrics (
        timestamp, node_id, active_users, active_counselors, total_sessions,
        average_session_duration, panic_alerts, mood_logs, room_messages, ai_interactions
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      metrics.timestamp,
      metrics.nodeId,
      metrics.activeUsers,
      metrics.activeCounselors,
      metrics.totalSessions,
      metrics.averageSessionDuration,
      metrics.panicAlerts,
      metrics.moodLogs,
      metrics.roomMessages,
      metrics.aiInteractions
    ]);
  }

  // User Journey Analytics
  async getUserJourneyMetrics(timeRange: 'day' | 'week' | 'month' = 'week'): Promise<UserJourneyMetrics> {
    const adapter = db.getAdapter();
    const now = new Date();
    const startDate = new Date(now.getTime() - this.getTimeRangeMs(timeRange));

    // Total users in time range
    const totalUsersResult = await adapter.query(`
      SELECT COUNT(DISTINCT user_id) as count FROM user_activities
      WHERE created_at >= ?
    `, [startDate.toISOString()]);

    // New users today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const newUsersResult = await adapter.query(`
      SELECT COUNT(*) as count FROM users
      WHERE created_at >= ?
    `, [today.toISOString()]);

    // Returning users (users with activity in last 7 days who also had activity before that)
    const returningUsersResult = await adapter.query(`
      SELECT COUNT(DISTINCT ua.user_id) as count
      FROM user_activities ua
      WHERE ua.created_at >= ?
      AND EXISTS (
        SELECT 1 FROM user_activities ua2
        WHERE ua2.user_id = ua.user_id
        AND ua2.created_at < ?
        AND ua2.created_at >= ?
      )
    `, [
      startDate.toISOString(),
      startDate.toISOString(),
      new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    ]);

    // Average sessions per user
    const avgSessionsResult = await adapter.query(`
      SELECT AVG(session_count) as avg_sessions
      FROM (
        SELECT user_id, COUNT(*) as session_count
        FROM chat_sessions
        WHERE created_at >= ?
        GROUP BY user_id
      )
    `, [startDate.toISOString()]);

    // User retention rates
    const retention = await this.calculateRetentionRates(startDate);

    // Drop-off points
    const dropOff = await this.calculateDropOffPoints(startDate);

    return {
      totalUsers: totalUsersResult[0]?.count || 0,
      newUsersToday: newUsersResult[0]?.count || 0,
      returningUsers: returningUsersResult[0]?.count || 0,
      averageSessionsPerUser: avgSessionsResult[0]?.avg_sessions || 0,
      userRetention: retention,
      dropOffPoints: dropOff
    };
  }

  private async calculateRetentionRates(startDate: Date): Promise<UserJourneyMetrics['userRetention']> {
    const adapter = db.getAdapter();

    const calculateRetention = async (days: number): Promise<number> => {
      const cohortStart = new Date(startDate.getTime() - days * 24 * 60 * 60 * 1000);
      const cohortEnd = new Date(cohortStart.getTime() + 24 * 60 * 60 * 1000);

      const cohortUsers = await adapter.query(`
        SELECT DISTINCT user_id FROM user_activities
        WHERE created_at >= ? AND created_at < ?
      `, [cohortStart.toISOString(), cohortEnd.toISOString()]);

      if (cohortUsers.length === 0) return 0;

      const retainedUsers = await adapter.query(`
        SELECT COUNT(DISTINCT user_id) as count FROM user_activities
        WHERE user_id IN (${cohortUsers.map(u => '?').join(',')})
        AND created_at >= ?
      `, [
        ...cohortUsers.map(u => u.user_id),
        new Date(cohortEnd.getTime() + days * 24 * 60 * 60 * 1000).toISOString()
      ]);

      return (retainedUsers[0]?.count || 0) / cohortUsers.length;
    };

    return {
      day1: await calculateRetention(1),
      day7: await calculateRetention(7),
      day30: await calculateRetention(30)
    };
  }

  private async calculateDropOffPoints(startDate: Date): Promise<UserJourneyMetrics['dropOffPoints']> {
    const adapter = db.getAdapter();

    // Users who registered but never started a chat
    const registeredOnly = await adapter.query(`
      SELECT COUNT(*) as count FROM users u
      WHERE u.created_at >= ?
      AND NOT EXISTS (SELECT 1 FROM chat_sessions cs WHERE cs.user_id = u.id)
    `, [startDate.toISOString()]);

    // Users who had first chat but no mood logs
    const chatOnly = await adapter.query(`
      SELECT COUNT(*) as count FROM users u
      WHERE u.created_at >= ?
      AND EXISTS (SELECT 1 FROM chat_sessions cs WHERE cs.user_id = u.id)
      AND NOT EXISTS (SELECT 1 FROM mood_logs ml WHERE ml.user_id = u.id)
    `, [startDate.toISOString()]);

    // Users who logged mood but stopped after week 1
    const week1DropOff = await adapter.query(`
      SELECT COUNT(*) as count FROM users u
      WHERE u.created_at >= ?
      AND EXISTS (
        SELECT 1 FROM user_activities ua
        WHERE ua.user_id = u.id AND ua.created_at <= ?
      )
      AND NOT EXISTS (
        SELECT 1 FROM user_activities ua
        WHERE ua.user_id = u.id AND ua.created_at > ?
      )
    `, [
      startDate.toISOString(),
      new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
    ]);

    const totalUsers = await adapter.query(`
      SELECT COUNT(*) as count FROM users WHERE created_at >= ?
    `, [startDate.toISOString()]);

    const total = totalUsers[0]?.count || 1; // Avoid division by zero

    return {
      registration: (registeredOnly[0]?.count || 0) / total,
      firstChat: (chatOnly[0]?.count || 0) / total,
      firstMoodLog: 0, // Would need more complex query
      week1: (week1DropOff[0]?.count || 0) / total
    };
  }

  // Emotional Health Analytics
  async getEmotionalHealthMetrics(timeRange: 'day' | 'week' | 'month' = 'week'): Promise<EmotionalHealthMetrics> {
    const adapter = db.getAdapter();
    const startDate = new Date(Date.now() - this.getTimeRangeMs(timeRange));

    // Average mood score
    const avgMoodResult = await adapter.query(`
      SELECT AVG(mood_level) as avg_mood FROM mood_logs
      WHERE created_at >= ?
    `, [startDate.toISOString()]);

    // Mood distribution
    const moodDistResult = await adapter.query(`
      SELECT mood_level, COUNT(*) as count
      FROM mood_logs
      WHERE created_at >= ?
      GROUP BY mood_level
    `, [startDate.toISOString()]);

    const moodDistribution: { [key: number]: number } = {};
    moodDistResult.forEach((row: any) => {
      moodDistribution[row.mood_level] = row.count;
    });

    // Panic frequency (per day)
    const panicResult = await adapter.query(`
      SELECT COUNT(*) as count FROM panic_alerts
      WHERE created_at >= ?
    `, [startDate.toISOString()]);

    const days = timeRange === 'day' ? 1 : timeRange === 'week' ? 7 : 30;
    const panicFrequency = (panicResult[0]?.count || 0) / days;

    // Recovery rate (users who improved mood after intervention)
    const recoveryRate = await this.calculateRecoveryRate(startDate);

    // Crisis intervention success
    const crisisSuccess = await this.calculateCrisisInterventionSuccess(startDate);

    // AI assistance usage
    const aiUsageResult = await adapter.query(`
      SELECT COUNT(*) as count FROM ai_interactions
      WHERE created_at >= ?
    `, [startDate.toISOString()]);

    // Counselor intervention rate
    const counselorRate = await this.calculateCounselorInterventionRate(startDate);

    return {
      averageMoodScore: avgMoodResult[0]?.avg_mood || 0,
      moodDistribution,
      panicFrequency,
      recoveryRate,
      crisisInterventionSuccess: crisisSuccess,
      aiAssistanceUsage: aiUsageResult[0]?.count || 0,
      counselorInterventionRate: counselorRate
    };
  }

  private async calculateRecoveryRate(startDate: Date): Promise<number> {
    // Simplified: users whose average mood improved over time
    const adapter = db.getAdapter();

    const result = await adapter.query(`
      SELECT COUNT(DISTINCT user_id) as improved_users
      FROM (
        SELECT user_id,
               AVG(CASE WHEN created_at < ? + INTERVAL '7 days' THEN mood_level END) as early_mood,
               AVG(CASE WHEN created_at >= ? + INTERVAL '7 days' THEN mood_level END) as late_mood
        FROM mood_logs
        WHERE created_at >= ?
        GROUP BY user_id
        HAVING early_mood IS NOT NULL AND late_mood IS NOT NULL AND late_mood > early_mood
      )
    `, [startDate.toISOString(), startDate.toISOString(), startDate.toISOString()]);

    const totalUsers = await adapter.query(`
      SELECT COUNT(DISTINCT user_id) as count FROM mood_logs WHERE created_at >= ?
    `, [startDate.toISOString()]);

    return (result[0]?.improved_users || 0) / (totalUsers[0]?.count || 1);
  }

  private async calculateCrisisInterventionSuccess(startDate: Date): Promise<number> {
    // Success rate of panic alert responses
    const adapter = db.getAdapter();

    const result = await adapter.query(`
      SELECT
        SUM(CASE WHEN resolution_status = 'resolved' THEN 1 ELSE 0 END) as resolved,
        COUNT(*) as total
      FROM panic_alerts
      WHERE created_at >= ?
    `, [startDate.toISOString()]);

    return result[0]?.total ? (result[0].resolved / result[0].total) : 0;
  }

  private async calculateCounselorInterventionRate(startDate: Date): Promise<number> {
    // Rate of counselor involvement in sessions
    const adapter = db.getAdapter();

    const result = await adapter.query(`
      SELECT
        SUM(CASE WHEN counselor_id IS NOT NULL THEN 1 ELSE 0 END) as with_counselor,
        COUNT(*) as total
      FROM chat_sessions
      WHERE created_at >= ?
    `, [startDate.toISOString()]);

    return result[0]?.total ? (result[0].with_counselor / result[0].total) : 0;
  }

  // Platform Performance Analytics
  async getPlatformPerformanceMetrics(): Promise<PlatformPerformanceMetrics> {
    const adapter = db.getAdapter();
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Average response time
    const responseTimeResult = await adapter.query(`
      SELECT AVG(response_time_ms) as avg_response FROM performance_metrics
      WHERE timestamp >= ?
    `, [last24h.toISOString()]);

    // System uptime (simplified)
    const uptimeResult = await adapter.query(`
      SELECT
        SUM(CASE WHEN status = 'healthy' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as uptime
      FROM system_health_checks
      WHERE timestamp >= ?
    `, [last24h.toISOString()]);

    // Error rate
    const errorResult = await adapter.query(`
      SELECT
        SUM(CASE WHEN level = 'error' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as error_rate
      FROM system_logs
      WHERE timestamp >= ?
    `, [last24h.toISOString()]);

    // Load distribution across nodes
    const loadDistResult = await adapter.query(`
      SELECT node_id, AVG(load_factor) as avg_load
      FROM node_status
      WHERE timestamp >= ?
      GROUP BY node_id
    `, [last24h.toISOString()]);

    const loadDistribution: { [nodeId: string]: number } = {};
    loadDistResult.forEach((row: any) => {
      loadDistribution[row.node_id] = row.avg_load;
    });

    // Federation health
    const federationHealth = await this.calculateFederationHealth();

    // Data sync latency
    const syncLatencyResult = await adapter.query(`
      SELECT AVG(latency_ms) as avg_latency FROM federation_sync_metrics
      WHERE timestamp >= ?
    `, [last24h.toISOString()]);

    return {
      averageResponseTime: responseTimeResult[0]?.avg_response || 0,
      systemUptime: uptimeResult[0]?.uptime || 100,
      errorRate: errorResult[0]?.error_rate || 0,
      loadDistribution,
      federationHealth,
      dataSyncLatency: syncLatencyResult[0]?.avg_latency || 0
    };
  }

  private async calculateFederationHealth(): Promise<number> {
    if (!distributedManager.isFederationEnabled()) return 100;

    const trustedNodes = distributedManager.getTrustedNodes();
    const nodeStatuses = distributedManager.getAllNodeStatuses();

    const healthyNodes = nodeStatuses.filter(status =>
      trustedNodes.includes(status.nodeId) && status.status === 'online'
    ).length;

    return trustedNodes.length ? (healthyNodes / trustedNodes.length) * 100 : 100;
  }

  // Alert Monitoring
  private startAlertMonitoring(): void {
    if (!this.config.alerts.enabled) return;

    this.alertCheckTimer = setInterval(() => {
      this.checkAlerts();
    }, 5 * 60 * 1000); // Check every 5 minutes
  }

  private async checkAlerts(): Promise<void> {
    const alerts: AlertCondition[] = [];

    // Check panic rate
    const panicRate = await this.getPanicAlertsCount();
    if (panicRate > this.config.alerts.thresholds.highPanicRate) {
      alerts.push({
        id: 'high_panic_rate',
        type: 'panic_rate',
        threshold: this.config.alerts.thresholds.highPanicRate,
        currentValue: panicRate,
        severity: panicRate > this.config.alerts.thresholds.highPanicRate * 2 ? 'critical' : 'high',
        triggered: true,
        lastTriggered: new Date().toISOString()
      });
    }

    // Check counselor availability
    const totalCounselors = await this.getActiveCounselorCount();
    const availableCounselors = await this.getActiveCounselorCount(); // This is already active
    const availabilityRate = totalCounselors ? availableCounselors / totalCounselors : 0;

    if (availabilityRate < this.config.alerts.thresholds.lowCounselorAvailability) {
      alerts.push({
        id: 'low_counselor_availability',
        type: 'counselor_availability',
        threshold: this.config.alerts.thresholds.lowCounselorAvailability,
        currentValue: availabilityRate,
        severity: 'high',
        triggered: true,
        lastTriggered: new Date().toISOString()
      });
    }

    // Check system load
    const nodeStatus = distributedManager.getNodeStatus();
    if (nodeStatus && nodeStatus.loadFactor > this.config.alerts.thresholds.highSystemLoad) {
      alerts.push({
        id: 'high_system_load',
        type: 'system_load',
        threshold: this.config.alerts.thresholds.highSystemLoad,
        currentValue: nodeStatus.loadFactor,
        severity: 'medium',
        triggered: true,
        lastTriggered: new Date().toISOString()
      });
    }

    // Store and notify alerts
    if (alerts.length > 0) {
      await this.storeAlerts(alerts);
      await this.notifyAlerts(alerts);
    }
  }

  private async storeAlerts(alerts: AlertCondition[]): Promise<void> {
    const adapter = db.getAdapter();

    for (const alert of alerts) {
      await adapter.query(`
        INSERT INTO system_alerts (id, type, threshold, current_value, severity, triggered, last_triggered)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (id) DO UPDATE SET
          current_value = excluded.current_value,
          triggered = excluded.triggered,
          last_triggered = excluded.last_triggered
      `, [
        alert.id,
        alert.type,
        alert.threshold,
        alert.currentValue,
        alert.severity,
        alert.triggered,
        alert.lastTriggered
      ]);
    }
  }

  private async notifyAlerts(alerts: AlertCondition[]): Promise<void> {
    // In a real implementation, this would send notifications to administrators
    console.warn('System alerts triggered:', alerts);
  }

  // Data Cleanup
  private async cleanupOldData(): Promise<void> {
    const adapter = db.getAdapter();
    const cutoffDate = new Date(Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000);

    await adapter.query('DELETE FROM activity_metrics WHERE timestamp < ?', [cutoffDate.toISOString()]);
    await adapter.query('DELETE FROM system_alerts WHERE last_triggered < ?', [cutoffDate.toISOString()]);
  }

  // Helper methods
  private getTimeRangeMs(timeRange: 'day' | 'week' | 'month'): number {
    switch (timeRange) {
      case 'day': return 24 * 60 * 60 * 1000;
      case 'week': return 7 * 24 * 60 * 60 * 1000;
      case 'month': return 30 * 24 * 60 * 60 * 1000;
      default: return 7 * 24 * 60 * 60 * 1000;
    }
  }

  // Public API
  async getActivityMetrics(timeRange: 'hour' | 'day' | 'week' = 'day'): Promise<ActivityMetrics[]> {
    const adapter = db.getAdapter();
    const startDate = new Date(Date.now() - this.getTimeRangeMs(timeRange));

    const result = await adapter.query(`
      SELECT * FROM activity_metrics
      WHERE timestamp >= ?
      ORDER BY timestamp DESC
    `, [startDate.toISOString()]);

    return result;
  }

  async getGlobalDashboardData(): Promise<{
    activity: ActivityMetrics[];
    userJourney: UserJourneyMetrics;
    emotionalHealth: EmotionalHealthMetrics;
    performance: PlatformPerformanceMetrics;
    activeAlerts: AlertCondition[];
  }> {
    const [activity, userJourney, emotionalHealth, performance, activeAlerts] = await Promise.all([
      this.getActivityMetrics('week'),
      this.getUserJourneyMetrics('week'),
      this.getEmotionalHealthMetrics('week'),
      this.getPlatformPerformanceMetrics(),
      this.getActiveAlerts()
    ]);

    return {
      activity,
      userJourney,
      emotionalHealth,
      performance,
      activeAlerts
    };
  }

  async getActiveAlerts(): Promise<AlertCondition[]> {
    const adapter = db.getAdapter();

    const result = await adapter.query(`
      SELECT * FROM system_alerts
      WHERE triggered = true
      ORDER BY last_triggered DESC
    `);

    return result.map((row: any) => ({
      id: row.id,
      type: row.type,
      threshold: row.threshold,
      currentValue: row.current_value,
      severity: row.severity,
      triggered: row.triggered,
      lastTriggered: row.last_triggered
    }));
  }

  // Cleanup
  shutdown(): void {
    if (this.aggregationTimer) {
      clearInterval(this.aggregationTimer);
    }
    if (this.alertCheckTimer) {
      clearInterval(this.alertCheckTimer);
    }
  }
}

export const analyticsManager = AnalyticsManager.getInstance();