import type { Notification, NotificationType, NotificationPriority } from '../types';

export class NotificationService {
  private static async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    priority: NotificationPriority = 'medium',
    data?: Record<string, any>,
    expiresAt?: Date
  ): Promise<void> {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          type,
          title,
          message,
          priority,
          data,
          expiresAt: expiresAt?.toISOString()
        })
      });

      if (!response.ok) {
        console.error('Failed to create notification:', await response.text());
      }
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  }

  static async notifyCounselorConnected(sessionId: string, userId: string): Promise<void> {
    await this.createNotification(
      userId,
      'counselor_connected',
      'Counselor Connected',
      'A counselor has joined your session. You can start chatting now.',
      'high'
    );
  }

  static async notifyNewMessage(userId: string, senderName: string): Promise<void> {
    await this.createNotification(
      userId,
      'new_message',
      'New Message',
      `You have a new message from ${senderName}`,
      'medium'
    );
  }

  static async notifySessionReminder(userId: string): Promise<void> {
    await this.createNotification(
      userId,
      'session_reminder',
      'Session Reminder',
      'You have an active session waiting. Don\'t forget to check in.',
      'low'
    );
  }

  static async notifyDailyCheckIn(userId: string): Promise<void> {
    await this.createNotification(
      userId,
      'daily_checkin',
      'Daily Check-in',
      'How are you feeling today? Take a moment to log your mood.',
      'low'
    );
  }

  static async notifyPanicResponse(userId: string): Promise<void> {
    await this.createNotification(
      userId,
      'panic_response',
      'Support Available',
      'Help is on the way. A counselor will respond to your panic alert shortly.',
      'urgent'
    );
  }

  static async notifyNewUserWaiting(counselorId: string): Promise<void> {
    await this.createNotification(
      counselorId,
      'new_user_waiting',
      'New User Waiting',
      'A user is waiting for support. Please check your active sessions.',
      'high'
    );
  }

  static async notifyPanicAlert(counselorId: string, sessionId: string): Promise<void> {
    await this.createNotification(
      counselorId,
      'panic_alert',
      'Panic Alert',
      'A user has triggered a panic alert and needs immediate attention.',
      'urgent',
      { sessionId }
    );
  }

  static async notifySessionAssignment(counselorId: string): Promise<void> {
    await this.createNotification(
      counselorId,
      'session_assignment',
      'New Session Assigned',
      'You have been assigned to a new support session.',
      'high'
    );
  }

  static async notifyAbuseReport(adminId: string, sessionId: string): Promise<void> {
    await this.createNotification(
      adminId,
      'abuse_report',
      'Abuse Report',
      'A new abuse report requires review.',
      'high',
      { sessionId }
    );
  }

  static async notifyCrisisAlert(adminId: string, sessionId: string): Promise<void> {
    await this.createNotification(
      adminId,
      'crisis_alert',
      'Crisis Alert',
      'A crisis situation has been detected and needs immediate attention.',
      'urgent',
      { sessionId }
    );
  }

  static async notifySystemIssue(adminId: string, component: string, message: string): Promise<void> {
    await this.createNotification(
      adminId,
      'system_issue',
      'System Issue',
      `Issue detected in ${component}: ${message}`,
      'high'
    );
  }
}