// Notification types for V5 modular architecture
export interface NotificationEvent {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  priority: NotificationPriority;
  is_read: boolean;
  created_at: string;
  expires_at?: string;
}

export interface NotificationSubscription {
  id: string;
  user_id: string;
  event_type: NotificationType;
  channels: NotificationChannel[];
  is_active: boolean;
  created_at: string;
}

export interface NotificationTemplate {
  id: string;
  type: NotificationType;
  title_template: string;
  message_template: string;
  priority: NotificationPriority;
  channels: NotificationChannel[];
  is_active: boolean;
}

export interface NotificationChannel {
  type: 'in_app' | 'email' | 'push' | 'sms';
  enabled: boolean;
  settings?: Record<string, any>;
}

export interface NotificationBatch {
  id: string;
  user_ids: string[];
  event_type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  priority: NotificationPriority;
  scheduled_at?: string;
  created_at: string;
}

export interface NotificationStats {
  total_sent: number;
  total_read: number;
  total_unread: number;
  by_type: Record<NotificationType, number>;
  by_priority: Record<NotificationPriority, number>;
  read_rate: number;
}

export type NotificationType =
  | 'mood_checkin_reminder'
  | 'chat_message'
  | 'crisis_alert'
  | 'support_request'
  | 'journal_reminder'
  | 'recovery_insight'
  | 'system_maintenance'
  | 'new_feature'
  | 'counselor_available'
  | 'session_ended'
  | 'panic_button_pressed'
  | 'moderation_alert'
  | 'admin_notification';

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface NotificationPreferences {
  user_id: string;
  email_enabled: boolean;
  push_enabled: boolean;
  sms_enabled: boolean;
  in_app_enabled: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  timezone: string;
  subscriptions: NotificationSubscription[];
}

export interface NotificationQueue {
  id: string;
  user_id: string;
  notification_id: string;
  channel: NotificationChannel['type'];
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  scheduled_at: string;
  sent_at?: string;
  error_message?: string;
  retry_count: number;
  max_retries: number;
}

export interface NotificationFilter {
  type?: NotificationType[];
  priority?: NotificationPriority[];
  is_read?: boolean;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

export interface NotificationResult {
  success: boolean;
  notification_id?: string;
  error?: string;
  queued_count?: number;
}

export interface NotificationBatchResult {
  success: boolean;
  sent_count: number;
  failed_count: number;
  errors: string[];
}