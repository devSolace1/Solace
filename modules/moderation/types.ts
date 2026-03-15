// Moderation types for V5 modular architecture
export interface Report {
  id: string;
  reporter_id: string;
  reported_user_id?: string;
  reported_content_id?: string;
  content_type: ContentType;
  report_type: ReportType;
  reason: string;
  description?: string;
  status: ReportStatus;
  priority: ReportPriority;
  assigned_to?: string;
  resolution?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
}

export interface ModerationAction {
  id: string;
  report_id: string;
  moderator_id: string;
  action_type: ModerationActionType;
  reason: string;
  details?: Record<string, any>;
  duration?: number; // in hours, for temporary actions
  created_at: string;
}

export interface ContentModeration {
  id: string;
  content_id: string;
  content_type: ContentType;
  moderation_status: ModerationStatus;
  flags: ContentFlag[];
  moderated_by?: string;
  moderated_at?: string;
  created_at: string;
}

export interface ModerationRule {
  id: string;
  name: string;
  description: string;
  rule_type: RuleType;
  conditions: Record<string, any>;
  actions: ModerationActionType[];
  is_active: boolean;
  priority: number;
  created_at: string;
}

export interface ModerationStats {
  total_reports: number;
  pending_reports: number;
  resolved_reports: number;
  reports_by_type: Record<ReportType, number>;
  reports_by_priority: Record<ReportPriority, number>;
  average_resolution_time: number;
  moderator_workload: Record<string, number>;
}

export interface ModerationQueue {
  id: string;
  report_id: string;
  priority: ReportPriority;
  assigned_to?: string;
  queued_at: string;
  processed_at?: string;
}

export interface ContentFlag {
  type: FlagType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  details?: Record<string, any>;
}

export type ContentType =
  | 'chat_message'
  | 'journal_entry'
  | 'mood_checkin'
  | 'support_room_post'
  | 'user_profile'
  | 'panic_alert';

export type ReportType =
  | 'harassment'
  | 'self_harm'
  | 'suicide_threat'
  | 'inappropriate_content'
  | 'spam'
  | 'hate_speech'
  | 'bullying'
  | 'privacy_violation'
  | 'misinformation'
  | 'other';

export type ReportStatus =
  | 'pending'
  | 'under_review'
  | 'investigating'
  | 'resolved'
  | 'dismissed'
  | 'escalated';

export type ReportPriority =
  | 'low'
  | 'medium'
  | 'high'
  | 'urgent'
  | 'critical';

export type ModerationActionType =
  | 'warn'
  | 'mute'
  | 'ban'
  | 'delete_content'
  | 'restrict_feature'
  | 'require_supervision'
  | 'escalate'
  | 'dismiss'
  | 'monitor';

export type ModerationStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'flagged'
  | 'under_review';

export type RuleType =
  | 'keyword_filter'
  | 'pattern_match'
  | 'behavioral'
  | 'threshold'
  | 'manual_review';

export type FlagType =
  | 'profanity'
  | 'threat'
  | 'self_harm'
  | 'hate_speech'
  | 'spam'
  | 'inappropriate'
  | 'misinformation'
  | 'privacy'
  | 'harassment';

export interface ModerationFilter {
  status?: ReportStatus[];
  priority?: ReportPriority[];
  type?: ReportType[];
  assigned_to?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

export interface ModerationResult {
  success: boolean;
  report_id?: string;
  action_id?: string;
  error?: string;
}

export interface AutoModerationResult {
  content_id: string;
  should_flag: boolean;
  flags: ContentFlag[];
  recommended_action?: ModerationActionType;
  confidence: number;
}