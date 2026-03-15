// Analytics types for V5 modular architecture
export interface AnalyticsEvent {
  id: string;
  user_id?: string; // Optional for anonymous tracking
  session_id: string;
  event_type: AnalyticsEventType;
  event_name: string;
  properties: Record<string, any>;
  timestamp: string;
  user_agent?: string;
  ip_hash?: string; // Anonymized IP
  device_info?: DeviceInfo;
  location_info?: LocationInfo; // Anonymized location data
}

export interface AnalyticsSession {
  id: string;
  user_id?: string;
  start_time: string;
  end_time?: string;
  duration?: number; // in seconds
  page_views: number;
  events_count: number;
  device_info: DeviceInfo;
  location_info?: LocationInfo;
  referrer?: string;
  user_agent: string;
  is_active: boolean;
}

export interface AnalyticsMetric {
  id: string;
  metric_name: string;
  metric_type: MetricType;
  value: number;
  dimensions: Record<string, string>;
  timestamp: string;
  period: AnalyticsPeriod;
}

export interface AnalyticsReport {
  id: string;
  report_name: string;
  report_type: ReportType;
  date_range: DateRange;
  metrics: AnalyticsMetric[];
  insights: AnalyticsInsight[];
  generated_at: string;
}

export interface AnalyticsInsight {
  id: string;
  insight_type: InsightType;
  title: string;
  description: string;
  data: Record<string, any>;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  recommendations?: string[];
}

export interface UserAnalytics {
  user_id: string;
  total_sessions: number;
  total_duration: number;
  average_session_duration: number;
  most_used_features: string[];
  mood_trend: 'improving' | 'stable' | 'declining';
  activity_score: number;
  last_active: string;
  engagement_level: 'low' | 'medium' | 'high';
}

export interface PlatformAnalytics {
  total_users: number;
  active_users_today: number;
  active_users_week: number;
  active_users_month: number;
  total_sessions: number;
  average_session_duration: number;
  top_features: FeatureUsage[];
  mood_distribution: Record<string, number>;
  crisis_alerts_count: number;
  support_requests_count: number;
  retention_rate: number;
  churn_rate: number;
}

export interface FeatureUsage {
  feature_name: string;
  usage_count: number;
  unique_users: number;
  average_time_spent: number;
  satisfaction_score?: number;
}

export interface DeviceInfo {
  device_type: 'mobile' | 'tablet' | 'desktop';
  os: string;
  os_version: string;
  browser: string;
  browser_version: string;
  screen_resolution: string;
  is_mobile: boolean;
  is_touch_device: boolean;
}

export interface LocationInfo {
  country_code?: string; // Anonymized
  region_code?: string; // Anonymized
  timezone: string;
  language: string;
}

export interface DateRange {
  start_date: string;
  end_date: string;
}

export type AnalyticsEventType =
  | 'page_view'
  | 'feature_usage'
  | 'user_action'
  | 'error'
  | 'performance'
  | 'engagement'
  | 'conversion'
  | 'custom';

export type MetricType =
  | 'count'
  | 'sum'
  | 'average'
  | 'percentage'
  | 'rate'
  | 'ratio';

export type AnalyticsPeriod =
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly';

export type ReportType =
  | 'user_engagement'
  | 'feature_usage'
  | 'performance'
  | 'retention'
  | 'conversion'
  | 'custom';

export type InsightType =
  | 'trend'
  | 'anomaly'
  | 'correlation'
  | 'prediction'
  | 'recommendation'
  | 'alert';

export interface AnalyticsFilter {
  event_type?: AnalyticsEventType[];
  date_range?: DateRange;
  user_id?: string;
  session_id?: string;
  properties?: Record<string, any>;
  limit?: number;
  offset?: number;
}

export interface AnalyticsResult {
  success: boolean;
  event_id?: string;
  error?: string;
}

export interface PrivacySettings {
  user_id: string;
  analytics_enabled: boolean;
  location_tracking: boolean;
  device_info_tracking: boolean;
  behavioral_tracking: boolean;
  data_retention_days: number;
  export_data_allowed: boolean;
  updated_at: string;
}