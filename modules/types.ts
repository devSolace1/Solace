// V5 Core Types - Shared across all modules

export interface User {
  id: string;
  created_at: string;
  role: 'user' | 'counselor' | 'admin';
  is_active: boolean;
  last_active: string;
}

export interface Session {
  id: string;
  participant_id: string;
  counselor_id?: string;
  status: 'waiting' | 'active' | 'completed' | 'cancelled';
  started_at: string;
  ended_at?: string;
  priority: 'normal' | 'high' | 'critical';
  risk_indicators?: Record<string, any>;
}

export interface Message {
  id: string;
  session_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'system' | 'emotion';
  created_at: string;
  is_deleted: boolean;
  metadata?: Record<string, any>;
}

export interface EmotionLog {
  id: string;
  user_id: string;
  emotion_type: string;
  intensity: number;
  context?: string;
  created_at: string;
}

export interface CrisisAlert {
  id: string;
  session_id: string;
  user_id: string;
  alert_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'escalated' | 'resolved';
  detection_method: string;
  risk_indicators: Record<string, any>;
  assigned_counselor_id?: string;
  created_at: string;
  resolved_at?: string;
}

export interface SupportRoom {
  id: string;
  name: string;
  description: string;
  category: string;
  max_participants: number;
  current_participants: number;
  is_private: boolean;
  tags: string[];
  status: 'active' | 'inactive' | 'moderated';
  created_by: string;
  created_at: string;
}

export interface NotificationEvent {
  id: string;
  type: 'message' | 'session_request' | 'panic_alert' | 'report' | 'system_warning';
  recipient_id: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  data?: Record<string, any>;
  read: boolean;
  created_at: string;
}

export interface PlatformMetrics {
  timestamp: string;
  active_users: number;
  daily_sessions: number;
  panic_alerts: number;
  system_health: 'healthy' | 'degraded' | 'unhealthy';
  database_usage: number;
  api_response_time: number;
}

// Module-specific types will be defined in their respective modules
export type ModuleName = 'auth' | 'chat' | 'emotion' | 'notification' | 'moderation' | 'analytics' | 'panic' | 'support-circle';

// API Response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

// Pagination
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

// Common filter options
export interface DateRange {
  start: string;
  end: string;
}

export interface BaseFilters {
  dateRange?: DateRange;
  limit?: number;
  offset?: number;
}