'use client';

import { createClient } from '@supabase/supabase-js';
import type {
  PanicEscalationLevel,
  PanicAlert,
  EmotionalState,
  RiskLevel,
  CounselorLoad
} from '../types/types';

export class PanicEscalationService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  /**
   * Create an intelligent panic alert with automatic escalation
   */
  async createPanicAlert(
    sessionId: string,
    userId: string,
    triggerReason: 'user_button' | 'auto_detection',
    emotionalState?: EmotionalState,
    riskLevel?: RiskLevel
  ): Promise<PanicAlert> {
    // Determine escalation level based on context
    const level = await this.determineEscalationLevel(sessionId, userId, emotionalState, riskLevel);

    // Create the alert
    const alert: Omit<PanicAlert, 'id' | 'createdAt' | 'resolvedAt'> = {
      sessionId,
      userId,
      level,
      triggeredBy: triggerReason,
      emotionalState: emotionalState || 'distressed',
      riskLevel: riskLevel || 'medium',
      status: 'active'
    };

    const { data: createdAlert, error } = await this.supabase
      .from('panic_alerts_v6')
      .insert({
        session_id: alert.sessionId,
        user_id: alert.userId,
        level: alert.level,
        triggered_by: alert.triggeredBy,
        emotional_state: alert.emotionalState,
        risk_level: alert.riskLevel,
        status: alert.status,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    // Auto-assign counselor based on level
    const assignedCounselor = await this.autoAssignCounselor(alert);

    // Update alert with assignment
    if (assignedCounselor) {
      await this.supabase
        .from('panic_alerts_v6')
        .update({ assigned_counselor: assignedCounselor })
        .eq('id', createdAlert.id);
    }

    // Trigger notifications
    await this.triggerNotifications(alert, assignedCounselor);

    return {
      id: createdAlert.id,
      sessionId: createdAlert.session_id,
      userId: createdAlert.user_id,
      level: createdAlert.level,
      triggeredBy: createdAlert.triggered_by,
      emotionalState: createdAlert.emotional_state,
      riskLevel: createdAlert.risk_level,
      assignedCounselor,
      status: createdAlert.status,
      createdAt: new Date(createdAlert.created_at)
    };
  }

  /**
   * Determine escalation level based on multiple factors
   */
  private async determineEscalationLevel(
    sessionId: string,
    userId: string,
    emotionalState?: EmotionalState,
    riskLevel?: RiskLevel
  ): Promise<PanicEscalationLevel> {
    let level: PanicEscalationLevel = 1;
    let factors = 0;

    // Emotional state factor
    if (emotionalState === 'high_risk') {
      level = Math.max(level, 3);
      factors++;
    } else if (emotionalState === 'distressed') {
      level = Math.max(level, 2);
      factors++;
    }

    // Risk level factor
    if (riskLevel === 'critical') {
      level = 3;
      factors++;
    } else if (riskLevel === 'high') {
      level = Math.max(level, 2);
      factors++;
    }

    // Recent panic history factor
    const recentPanics = await this.getRecentPanicHistory(userId);
    if (recentPanics >= 3) {
      level = Math.max(level, 3); // Multiple recent panics = critical
    } else if (recentPanics >= 1) {
      level = Math.max(level, 2); // Recent panic = elevated
    }

    // Session context factor
    const sessionContext = await this.analyzeSessionContext(sessionId);
    if (sessionContext.highIntensity) {
      level = Math.max(level, 2);
    }
    if (sessionContext.longSession) {
      level = Math.max(level, 2);
    }

    // Counselor availability factor
    const availableCounselors = await this.getAvailableCounselorsCount();
    if (availableCounselors === 0) {
      level = Math.max(level, 3); // No counselors available = critical
    }

    return level;
  }

  /**
   * Auto-assign the best available counselor for the alert
   */
  private async autoAssignCounselor(alert: Omit<PanicAlert, 'id' | 'createdAt' | 'resolvedAt'>): Promise<string | undefined> {
    const availableCounselors = await this.getAvailableCounselors();

    if (availableCounselors.length === 0) {
      return undefined;
    }

    // For level 3 alerts, prioritize the most experienced counselor
    if (alert.level === 3) {
      const sortedByExperience = availableCounselors.sort((a, b) =>
        b.totalSessionsToday - a.totalSessionsToday
      );
      return sortedByExperience[0]?.counselorId;
    }

    // For lower levels, use load balancing
    const sortedByLoad = availableCounselors.sort((a, b) =>
      a.activeSessions - b.activeSessions
    );
    return sortedByLoad[0]?.counselorId;
  }

  /**
   * Trigger appropriate notifications for the panic alert
   */
  private async triggerNotifications(
    alert: PanicAlert,
    assignedCounselor?: string
  ): Promise<void> {
    const notifications = [];

    // Always notify assigned counselor
    if (assignedCounselor) {
      notifications.push({
        userId: assignedCounselor,
        type: 'panic_alert',
        title: `Panic Alert - Level ${alert.level}`,
        message: `A user has triggered a panic alert. Please respond immediately.`,
        priority: alert.level === 3 ? 'critical' : 'high',
        data: {
          sessionId: alert.sessionId,
          userId: alert.userId,
          level: alert.level,
          emotionalState: alert.emotionalState
        }
      });
    }

    // For level 2+, notify all available counselors
    if (alert.level >= 2) {
      const availableCounselors = await this.getAvailableCounselors();
      availableCounselors.forEach(counselor => {
        if (counselor.counselorId !== assignedCounselor) {
          notifications.push({
            userId: counselor.counselorId,
            type: 'panic_backup',
            title: `Backup Alert - Level ${alert.level}`,
            message: `Additional support may be needed for an active panic situation.`,
            priority: 'medium',
            data: {
              sessionId: alert.sessionId,
              level: alert.level
            }
          });
        }
      });
    }

    // For level 3, notify admins
    if (alert.level === 3) {
      const admins = await this.getAdminUsers();
      admins.forEach(admin => {
        notifications.push({
          userId: admin.id,
          type: 'crisis_alert',
          title: 'CRITICAL: Crisis Situation',
          message: `Level 3 panic alert requires immediate administrative attention.`,
          priority: 'critical',
          data: {
            sessionId: alert.sessionId,
            userId: alert.userId,
            assignedCounselor
          }
        });
      });
    }

    // Send all notifications
    for (const notification of notifications) {
      await this.sendNotification(notification);
    }
  }

  /**
   * Resolve a panic alert
   */
  async resolvePanicAlert(alertId: string, resolverId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('panic_alerts_v6')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolved_by: resolverId
      })
      .eq('id', alertId);

    if (error) {
      console.error('Failed to resolve panic alert:', error);
      return false;
    }

    // Send resolution notification
    await this.sendNotification({
      userId: resolverId,
      type: 'panic_resolved',
      title: 'Panic Alert Resolved',
      message: 'The panic situation has been successfully resolved.',
      priority: 'low',
      data: { alertId }
    });

    return true;
  }

  /**
   * Get active panic alerts for monitoring
   */
  async getActiveAlerts(): Promise<PanicAlert[]> {
    const { data: alerts, error } = await this.supabase
      .from('panic_alerts_v6')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return alerts.map(alert => ({
      id: alert.id,
      sessionId: alert.session_id,
      userId: alert.user_id,
      level: alert.level,
      triggeredBy: alert.triggered_by,
      emotionalState: alert.emotional_state,
      riskLevel: alert.risk_level,
      assignedCounselor: alert.assigned_counselor,
      status: alert.status,
      createdAt: new Date(alert.created_at)
    }));
  }

  /**
   * Get escalation statistics for monitoring
   */
  async getEscalationStats(): Promise<{
    totalToday: number;
    byLevel: Record<PanicEscalationLevel, number>;
    averageResponseTime: number;
    resolutionRate: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: alerts, error } = await this.supabase
      .from('panic_alerts_v6')
      .select('*')
      .gte('created_at', today.toISOString());

    if (error) throw error;

    const byLevel = { 1: 0, 2: 0, 3: 0 };
    let totalResponseTime = 0;
    let resolvedCount = 0;

    alerts.forEach(alert => {
      byLevel[alert.level as PanicEscalationLevel]++;

      if (alert.resolved_at) {
        resolvedCount++;
        const responseTime = (new Date(alert.resolved_at).getTime() - new Date(alert.created_at).getTime()) / (1000 * 60);
        totalResponseTime += responseTime;
      }
    });

    return {
      totalToday: alerts.length,
      byLevel,
      averageResponseTime: resolvedCount > 0 ? totalResponseTime / resolvedCount : 0,
      resolutionRate: alerts.length > 0 ? resolvedCount / alerts.length : 0
    };
  }

  // Helper methods

  private async getRecentPanicHistory(userId: string): Promise<number> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { count } = await this.supabase
      .from('panic_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', sevenDaysAgo.toISOString());

    return count || 0;
  }

  private async analyzeSessionContext(sessionId: string): Promise<{
    highIntensity: boolean;
    longSession: boolean;
  }> {
    const { data: session } = await this.supabase
      .from('sessions')
      .select('created_at, ended_at')
      .eq('id', sessionId)
      .single();

    if (!session) {
      return { highIntensity: false, longSession: false };
    }

    const startTime = new Date(session.created_at);
    const endTime = session.ended_at ? new Date(session.ended_at) : new Date();
    const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60); // minutes

    // Check message intensity
    const { data: messages } = await this.supabase
      .from('messages')
      .select('content')
      .eq('session_id', sessionId);

    const highIntensity = messages ? messages.length > 20 : false;

    return {
      highIntensity,
      longSession: duration > 90
    };
  }

  private async getAvailableCounselors(): Promise<CounselorLoad[]> {
    // This would integrate with the CounselorMatchingService
    // For now, return a simplified version
    const { data: counselors } = await this.supabase
      .from('users')
      .select('id, last_seen_at')
      .eq('role', 'counselor')
      .eq('is_active', true);

    return counselors?.map(c => ({
      counselorId: c.id,
      activeSessions: 0, // Simplified
      totalSessionsToday: 0,
      averageSessionDuration: 0,
      specialization: [],
      availability: 'available' as const,
      lastActive: new Date(c.last_seen_at)
    })) || [];
  }

  private async getAvailableCounselorsCount(): Promise<number> {
    const counselors = await this.getAvailableCounselors();
    return counselors.length;
  }

  private async getAdminUsers(): Promise<Array<{ id: string }>> {
    const { data: admins } = await this.supabase
      .from('users')
      .select('id')
      .eq('role', 'moderator');

    return admins || [];
  }

  private async sendNotification(notification: any): Promise<void> {
    // This would integrate with the NotificationService
    console.log('Sending notification:', notification);
  }
}