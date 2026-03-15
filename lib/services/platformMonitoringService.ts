import { PlatformHealthStatus, PlatformMetric, PlatformMetricPeriod } from '../../types';
import { getSupabaseServer } from '../supabaseServer';

export class PlatformMonitoringService {
  static async getHealthStatus(): Promise<PlatformHealthStatus> {
    const supabase = getSupabaseServer();

    const health: PlatformHealthStatus = {
      overall: 'healthy',
      components: {
        database: 'healthy',
        api: 'healthy',
        realtime: 'healthy',
        notifications: 'healthy'
      },
      metrics: {
        activeUsers: 0,
        activeSessions: 0,
        pendingCrisisAlerts: 0,
        responseTime: 0
      },
      lastChecked: new Date().toISOString()
    };

    if (!supabase) {
      health.overall = 'unhealthy';
      health.components.database = 'unhealthy';
      return health;
    }

    try {
      // Check database connectivity
      const { error: dbError } = await supabase.from('users').select('count', { count: 'exact', head: true });
      if (dbError) {
        health.components.database = 'unhealthy';
        health.overall = 'unhealthy';
      }

      // Get active users (users seen in last 24 hours)
      const yesterday = new Date();
      yesterday.setHours(yesterday.getHours() - 24);

      const { count: activeUsers, error: usersError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gt('last_seen_at', yesterday.toISOString());

      if (!usersError && activeUsers !== null) {
        health.metrics.activeUsers = activeUsers;
      }

      // Get active sessions
      const { count: activeSessions, error: sessionsError } = await supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      if (!sessionsError && activeSessions !== null) {
        health.metrics.activeSessions = activeSessions;
      }

      // Get pending crisis alerts
      const { count: pendingAlerts, error: alertsError } = await supabase
        .from('crisis_alerts_v4')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      if (!alertsError && pendingAlerts !== null) {
        health.metrics.pendingCrisisAlerts = pendingAlerts;
      }

      // Check system health records
      const { data: systemHealth, error: healthError } = await supabase
        .from('system_health')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(4);

      if (!healthError && systemHealth) {
        for (const component of systemHealth) {
          if (component.status !== 'healthy') {
            health.components[component.component as keyof typeof health.components] = component.status;
            if (component.status === 'unhealthy') {
              health.overall = 'unhealthy';
            } else if (health.overall === 'healthy') {
              health.overall = 'degraded';
            }
          }
        }
      }

      // Calculate overall status
      if (health.overall === 'healthy') {
        const degradedCount = Object.values(health.components).filter(s => s === 'degraded').length;
        const unhealthyCount = Object.values(health.components).filter(s => s === 'unhealthy').length;

        if (unhealthyCount > 0) {
          health.overall = 'unhealthy';
        } else if (degradedCount > 0) {
          health.overall = 'degraded';
        }
      }

    } catch (error) {
      console.error('Error checking platform health:', error);
      health.overall = 'unhealthy';
    }

    return health;
  }

  static async recordMetric(
    name: string,
    value: number,
    unit?: string,
    dimensions?: Record<string, any>
  ): Promise<void> {
    const supabase = getSupabaseServer();
    if (!supabase) return;

    try {
      const now = new Date();
      const periodStart = new Date(now);

      // Align to minute boundary for minute-level metrics
      periodStart.setSeconds(0, 0);

      await supabase
        .from('platform_metrics')
        .insert({
          metric_name: name,
          metric_value: value,
          metric_unit: unit,
          collection_period: 'minute',
          period_start: periodStart.toISOString(),
          period_end: new Date(periodStart.getTime() + 60 * 1000).toISOString(),
          dimensions: dimensions || {}
        });
    } catch (error) {
      console.error('Error recording metric:', error);
    }
  }

  static async getMetrics(
    metricName?: string,
    period: PlatformMetricPeriod = 'hour',
    hoursBack = 24
  ): Promise<PlatformMetric[]> {
    const supabase = getSupabaseServer();
    if (!supabase) return [];

    try {
      const startTime = new Date();
      startTime.setHours(startTime.getHours() - hoursBack);

      let query = supabase
        .from('platform_metrics')
        .select('*')
        .eq('collection_period', period)
        .gte('period_start', startTime.toISOString())
        .order('period_start', { ascending: true });

      if (metricName) {
        query = query.eq('metric_name', metricName);
      }

      const { data, error } = await query.limit(1000);

      if (error) {
        console.error('Error fetching metrics:', error);
        return [];
      }

      return data;
    } catch (error) {
      console.error('Error fetching metrics:', error);
      return [];
    }
  }

  static async getAggregatedMetrics(
    metricName: string,
    period: PlatformMetricPeriod,
    groupBy: 'hour' | 'day' | 'week' = 'hour',
    hoursBack = 168 // 1 week
  ): Promise<Array<{ period: string; avg: number; min: number; max: number; count: number }>> {
    const supabase = getSupabaseServer();
    if (!supabase) return [];

    try {
      const startTime = new Date();
      startTime.setHours(startTime.getHours() - hoursBack);

      const { data, error } = await supabase
        .rpc('aggregate_platform_metrics', {
          metric_name_param: metricName,
          period_param: period,
          start_time: startTime.toISOString(),
          group_by: groupBy
        });

      if (error) {
        console.error('Error aggregating metrics:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error aggregating metrics:', error);
      return [];
    }
  }

  static async checkSystemHealth(): Promise<void> {
    const supabase = getSupabaseServer();
    if (!supabase) return;

    const components = ['database', 'api', 'realtime', 'notifications'];
    const now = new Date().toISOString();

    for (const component of components) {
      try {
        let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
        let message = 'Component operating normally';
        const metrics: Record<string, any> = {};

        switch (component) {
          case 'database':
            // Test database connectivity and performance
            const start = Date.now();
            const { error } = await supabase.from('users').select('count', { count: 'exact', head: true });
            const duration = Date.now() - start;

            if (error) {
              status = 'unhealthy';
              message = 'Database connection failed';
            } else if (duration > 1000) {
              status = 'degraded';
              message = 'Database response slow';
            }
            metrics.response_time_ms = duration;
            break;

          case 'api':
            // Check recent API errors from analytics
            const { count: apiErrors } = await supabase
              .from('analytics_events')
              .select('*', { count: 'exact', head: true })
              .eq('event_type', 'api_error')
              .gte('created_at', new Date(Date.now() - 3600000).toISOString()); // Last hour

            if (apiErrors && apiErrors > 10) {
              status = 'degraded';
              message = 'High API error rate detected';
            }
            metrics.error_count = apiErrors || 0;
            break;

          case 'realtime':
            // Check active sessions as proxy for realtime health
            const { count: activeSessions } = await supabase
              .from('sessions')
              .select('*', { count: 'exact', head: true })
              .eq('status', 'active');

            metrics.active_sessions = activeSessions || 0;
            message = `${activeSessions || 0} active sessions`;
            break;

          case 'notifications':
            // Check notification delivery success
            const { count: delivered } = await supabase
              .from('notifications')
              .select('*', { count: 'exact', head: true })
              .eq('is_read', true)
              .gte('created_at', new Date(Date.now() - 86400000).toISOString()); // Last 24 hours

            metrics.notifications_delivered = delivered || 0;
            message = `${delivered || 0} notifications delivered in last 24h`;
            break;
        }

        // Insert health record
        await supabase
          .from('system_health')
          .insert({
            component,
            status,
            message,
            metrics
          });

      } catch (error) {
        console.error(`Error checking ${component} health:`, error);

        // Insert failure record
        await supabase
          .from('system_health')
          .insert({
            component,
            status: 'unhealthy',
            message: 'Health check failed',
            metrics: { error: error instanceof Error ? error.message : 'Unknown error' }
          });
      }
    }
  }

  static async getAlertSummary(): Promise<{
    total: number;
    bySeverity: Record<string, number>;
    byStatus: Record<string, number>;
    recentEscalations: number;
  }> {
    const supabase = getSupabaseServer();
    if (!supabase) return { total: 0, bySeverity: {}, byStatus: {}, recentEscalations: 0 };

    try {
      const { data: alerts, error } = await supabase
        .from('crisis_alerts_v4')
        .select('severity, status, escalated_at');

      if (error || !alerts) {
        return { total: 0, bySeverity: {}, byStatus: {}, recentEscalations: 0 };
      }

      const summary = {
        total: alerts.length,
        bySeverity: {} as Record<string, number>,
        byStatus: {} as Record<string, number>,
        recentEscalations: 0
      };

      const oneHourAgo = new Date(Date.now() - 3600000);

      for (const alert of alerts) {
        // Count by severity
        summary.bySeverity[alert.severity] = (summary.bySeverity[alert.severity] || 0) + 1;

        // Count by status
        summary.byStatus[alert.status] = (summary.byStatus[alert.status] || 0) + 1;

        // Count recent escalations
        if (alert.escalated_at && new Date(alert.escalated_at) > oneHourAgo) {
          summary.recentEscalations++;
        }
      }

      return summary;
    } catch (error) {
      console.error('Error getting alert summary:', error);
      return { total: 0, bySeverity: {}, byStatus: {}, recentEscalations: 0 };
    }
  }

  static async getPerformanceMetrics(): Promise<{
    avgSessionDuration: number;
    avgResponseTime: number;
    userRetention: number;
    sessionCompletionRate: number;
  }> {
    const supabase = getSupabaseServer();
    if (!supabase) return {
      avgSessionDuration: 0,
      avgResponseTime: 0,
      userRetention: 0,
      sessionCompletionRate: 0
    };

    try {
      // This would require more complex queries in production
      // For now, return placeholder metrics
      return {
        avgSessionDuration: 25, // minutes
        avgResponseTime: 3.2, // minutes
        userRetention: 0.68, // 68%
        sessionCompletionRate: 0.82 // 82%
      };
    } catch (error) {
      console.error('Error getting performance metrics:', error);
      return {
        avgSessionDuration: 0,
        avgResponseTime: 0,
        userRetention: 0,
        sessionCompletionRate: 0
      };
    }
  }
}