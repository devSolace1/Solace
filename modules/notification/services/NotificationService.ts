import { createClient } from '@supabase/supabase-js';
import type {
  NotificationEvent,
  NotificationSubscription,
  NotificationTemplate,
  NotificationPreferences,
  NotificationQueue,
  NotificationFilter,
  NotificationResult,
  NotificationBatchResult,
  NotificationType,
  NotificationPriority,
  NotificationChannel
} from '../types';

export class NotificationService {
  private supabase;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }

  /**
   * Send a notification to a user
   */
  async sendNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data?: Record<string, any>,
    priority: NotificationPriority = 'medium',
    expiresAt?: string
  ): Promise<NotificationResult> {
    try {
      // Get user's notification preferences
      const preferences = await this.getUserPreferences(userId);

      if (!preferences.in_app_enabled) {
        return { success: false, error: 'Notifications disabled by user' };
      }

      // Check quiet hours
      if (this.isInQuietHours(preferences)) {
        // Schedule for later or skip based on priority
        if (priority === 'urgent' || priority === 'high') {
          // Send immediately for urgent notifications
        } else {
          return { success: false, error: 'In quiet hours' };
        }
      }

      // Create notification event
      const { data: notification, error } = await this.supabase
        .from('notification_events_v5')
        .insert({
          user_id: userId,
          type,
          title,
          message,
          data,
          priority,
          is_read: false,
          expires_at: expiresAt
        })
        .select()
        .single();

      if (error) throw error;

      // Queue notifications for different channels
      await this.queueNotifications(notification, preferences);

      return { success: true, notification_id: notification.id };
    } catch (error) {
      console.error('Failed to send notification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send batch notifications
   */
  async sendBatchNotification(
    userIds: string[],
    type: NotificationType,
    title: string,
    message: string,
    data?: Record<string, any>,
    priority: NotificationPriority = 'medium'
  ): Promise<NotificationBatchResult> {
    const results: NotificationResult[] = [];
    let sentCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const userId of userIds) {
      const result = await this.sendNotification(userId, type, title, message, data, priority);
      results.push(result);

      if (result.success) {
        sentCount++;
      } else {
        failedCount++;
        if (result.error) errors.push(result.error);
      }
    }

    return {
      success: failedCount === 0,
      sent_count: sentCount,
      failed_count: failedCount,
      errors
    };
  }

  /**
   * Get user's notifications
   */
  async getUserNotifications(
    userId: string,
    filter: NotificationFilter = {}
  ): Promise<NotificationEvent[]> {
    let query = this.supabase
      .from('notification_events_v5')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (filter.type && filter.type.length > 0) {
      query = query.in('type', filter.type);
    }

    if (filter.priority && filter.priority.length > 0) {
      query = query.in('priority', filter.priority);
    }

    if (typeof filter.is_read === 'boolean') {
      query = query.eq('is_read', filter.is_read);
    }

    if (filter.date_from) {
      query = query.gte('created_at', filter.date_from);
    }

    if (filter.date_to) {
      query = query.lte('created_at', filter.date_to);
    }

    if (filter.limit) {
      query = query.limit(filter.limit);
    }

    if (filter.offset) {
      query = query.range(filter.offset, (filter.offset + (filter.limit || 50)) - 1);
    }

    const { data: notifications, error } = await query;
    if (error) throw error;

    return notifications || [];
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('notification_events_v5')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', userId);

    return !error;
  }

  /**
   * Mark all notifications as read for user
   */
  async markAllAsRead(userId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('notification_events_v5')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    return !error;
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('notification_events_v5')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', userId);

    return !error;
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(userId: string): Promise<any> {
    const { data: stats, error } = await this.supabase
      .rpc('get_notification_stats', { user_id: userId });

    if (error) throw error;
    return stats;
  }

  /**
   * Update user notification preferences
   */
  async updateUserPreferences(
    userId: string,
    preferences: Partial<Omit<NotificationPreferences, 'user_id' | 'subscriptions'>>
  ): Promise<boolean> {
    const { error } = await this.supabase
      .from('notification_preferences_v5')
      .upsert({
        user_id: userId,
        ...preferences,
        updated_at: new Date().toISOString()
      });

    return !error;
  }

  /**
   * Get user notification preferences
   */
  async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    const { data: preferences, error } = await this.supabase
      .from('notification_preferences_v5')
      .select(`
        *,
        notification_subscriptions_v5 (*)
      `)
      .eq('user_id', userId)
      .single();

    if (error) {
      // Return default preferences if none exist
      return {
        user_id: userId,
        email_enabled: false,
        push_enabled: false,
        sms_enabled: false,
        in_app_enabled: true,
        timezone: 'UTC',
        subscriptions: []
      };
    }

    return {
      ...preferences,
      subscriptions: preferences.notification_subscriptions_v5 || []
    };
  }

  /**
   * Subscribe to notification type
   */
  async subscribeToNotifications(
    userId: string,
    eventType: NotificationType,
    channels: NotificationChannel[]
  ): Promise<boolean> {
    const { error } = await this.supabase
      .from('notification_subscriptions_v5')
      .upsert({
        user_id: userId,
        event_type: eventType,
        channels,
        is_active: true,
        updated_at: new Date().toISOString()
      });

    return !error;
  }

  /**
   * Unsubscribe from notification type
   */
  async unsubscribeFromNotifications(userId: string, eventType: NotificationType): Promise<boolean> {
    const { error } = await this.supabase
      .from('notification_subscriptions_v5')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('event_type', eventType);

    return !error;
  }

  /**
   * Clean up expired notifications
   */
  async cleanupExpiredNotifications(): Promise<number> {
    const { data: deletedCount, error } = await this.supabase
      .rpc('cleanup_expired_notifications');

    if (error) throw error;
    return deletedCount || 0;
  }

  /**
   * Process notification queue (for background job)
   */
  async processNotificationQueue(): Promise<void> {
    const { data: queuedNotifications, error } = await this.supabase
      .from('notification_queue_v5')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', new Date().toISOString())
      .limit(50);

    if (error) throw error;

    for (const queued of queuedNotifications || []) {
      await this.processQueuedNotification(queued);
    }
  }

  /**
   * Private helper methods
   */
  private async queueNotifications(
    notification: NotificationEvent,
    preferences: NotificationPreferences
  ): Promise<void> {
    const channels: NotificationChannel['type'][] = [];

    if (preferences.in_app_enabled) channels.push('in_app');
    if (preferences.email_enabled) channels.push('email');
    if (preferences.push_enabled) channels.push('push');
    if (preferences.sms_enabled) channels.push('sms');

    const queueInserts = channels.map(channel => ({
      user_id: notification.user_id,
      notification_id: notification.id,
      channel,
      status: 'pending' as const,
      scheduled_at: new Date().toISOString(),
      retry_count: 0,
      max_retries: 3
    }));

    if (queueInserts.length > 0) {
      const { error } = await this.supabase
        .from('notification_queue_v5')
        .insert(queueInserts);

      if (error) console.error('Failed to queue notifications:', error);
    }
  }

  private isInQuietHours(preferences: NotificationPreferences): boolean {
    if (!preferences.quiet_hours_start || !preferences.quiet_hours_end) {
      return false;
    }

    const now = new Date();
    const userTimezone = preferences.timezone || 'UTC';

    // Convert current time to user's timezone
    const userTime = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }));
    const currentHour = userTime.getHours();

    const startHour = parseInt(preferences.quiet_hours_start.split(':')[0]);
    const endHour = parseInt(preferences.quiet_hours_end.split(':')[0]);

    if (startHour < endHour) {
      // Same day quiet hours
      return currentHour >= startHour && currentHour < endHour;
    } else {
      // Overnight quiet hours
      return currentHour >= startHour || currentHour < endHour;
    }
  }

  private async processQueuedNotification(queued: NotificationQueue): Promise<void> {
    try {
      // Here you would implement the actual sending logic for each channel
      // For now, just mark as sent for in_app notifications
      if (queued.channel === 'in_app') {
        await this.supabase
          .from('notification_queue_v5')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString()
          })
          .eq('id', queued.id);
      } else {
        // For other channels, you'd integrate with email/SMS/push services
        // For now, mark as failed
        await this.supabase
          .from('notification_queue_v5')
          .update({
            status: 'failed',
            error_message: `${queued.channel} not implemented yet`
          })
          .eq('id', queued.id);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await this.supabase
        .from('notification_queue_v5')
        .update({
          status: queued.retry_count >= queued.max_retries ? 'failed' : 'pending',
          error_message: errorMessage,
          retry_count: queued.retry_count + 1
        })
        .eq('id', queued.id);
    }
  }
}