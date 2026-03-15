-- Solace: Anonymous Emotional Support Platform
-- PostgreSQL schema for production-ready core data model

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Users: participants and counselors (and moderators)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL CHECK (role IN ('participant', 'counselor', 'moderator')),
  anonymous_label text NOT NULL DEFAULT 'Anonymous',
  counselor_code text UNIQUE, -- For counselors: unique login code
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Optional recovery keys (stored hashed) for account restoration without PII
CREATE TABLE IF NOT EXISTS recovery_keys (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  recovery_key_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Sessions: one chat session between a participant and a counselor
CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  counselor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  status text NOT NULL CHECK (status IN ('waiting', 'active', 'ended')) DEFAULT 'waiting',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  panic boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Message history for sessions
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  is_flagged boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Daily mood check-ins for participants
CREATE TABLE IF NOT EXISTS mood_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mood text NOT NULL,
  stress_level int CHECK (stress_level BETWEEN 0 AND 10),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Journal entries
CREATE TABLE IF NOT EXISTS journals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL,
  visible_to_counselor boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Reports for moderation
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id uuid REFERENCES sessions(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('harassment', 'boundary', 'safety', 'other')),
  details text,
  status text NOT NULL CHECK (status IN ('pending', 'resolved', 'dismissed')) DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Panic alerts for escalation
CREATE TABLE IF NOT EXISTS panic_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('active', 'resolved')) DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

-- Indexes for panic alerts
CREATE INDEX IF NOT EXISTS idx_panic_alerts_status ON panic_alerts(status);

-- Indexes to support lookups
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_mood_logs_user ON mood_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_journals_user ON journals(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported ON reports(reported_user_id);

-- Safety triggers: update last_seen_at automatically
CREATE OR REPLACE FUNCTION touch_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users SET last_seen_at = now() WHERE id = NEW.participant_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS touch_last_seen_trigger ON sessions;
CREATE TRIGGER touch_last_seen_trigger
AFTER INSERT OR UPDATE ON sessions
FOR EACH ROW EXECUTE FUNCTION touch_last_seen();

-- Helper to find an available counselor (least active sessions)
CREATE OR REPLACE FUNCTION find_available_counselor()
RETURNS TABLE(id uuid, anonymous_label text) AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.anonymous_label
  FROM users u
  WHERE u.role = 'counselor' AND u.is_active
  ORDER BY (
    SELECT COUNT(*) FROM sessions s WHERE s.counselor_id = u.id AND s.status = 'active'
  ) ASC, u.created_at ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- Improved counselor matching V2
CREATE OR REPLACE FUNCTION find_available_counselor_v2(severity text DEFAULT 'medium', preferences text[] DEFAULT '{}')
RETURNS TABLE(id uuid, anonymous_label text, score float) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.anonymous_label,
    -- Score based on load, experience, and preferences
    (10 - LEAST(10, (SELECT COUNT(*) FROM sessions s WHERE s.counselor_id = u.id AND s.status = 'active'))) +
    CASE WHEN severity = 'high' THEN 2 ELSE 0 END +
    CASE WHEN array_length(preferences, 1) > 0 THEN 1 ELSE 0 END
    as score
  FROM users u
  WHERE u.role = 'counselor' AND u.is_active
  ORDER BY score DESC, u.created_at ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

-- ===========================================
-- V3.5 SCHEMA EXTENSIONS
-- ===========================================

-- Notifications system for in-app alerts
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('counselor_connected', 'new_message', 'session_reminder', 'daily_checkin', 'panic_response', 'new_user_waiting', 'panic_alert', 'session_assignment', 'abuse_report', 'crisis_alert', 'system_issue')),
  title text NOT NULL,
  message text NOT NULL,
  data jsonb DEFAULT '{}'::jsonb,
  is_read boolean NOT NULL DEFAULT false,
  priority text NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

-- Enhanced moderation flags with admin actions
CREATE TABLE IF NOT EXISTS moderation_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES messages(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  flagged_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  flag_type text NOT NULL CHECK (flag_type IN ('romantic', 'sexual', 'predatory', 'spam', 'harassment', 'self_harm', 'suicide', 'other')),
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  reason text,
  status text NOT NULL CHECK (status IN ('pending', 'under_review', 'resolved', 'dismissed')) DEFAULT 'pending',
  reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  action_taken text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Admin actions log for audit trail
CREATE TABLE IF NOT EXISTS admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN ('suspend_user', 'suspend_counselor', 'resolve_flag', 'dismiss_flag', 'escalate_crisis', 'system_maintenance', 'other')),
  target_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  target_session_id uuid REFERENCES sessions(id) ON DELETE SET NULL,
  details text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Anonymous analytics (no personal data)
CREATE TABLE IF NOT EXISTS analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL CHECK (event_type IN ('session_started', 'session_ended', 'message_sent', 'mood_logged', 'journal_entry', 'panic_triggered', 'page_view', 'feature_used')),
  anonymous_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- System health monitoring
CREATE TABLE IF NOT EXISTS system_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  component text NOT NULL CHECK (component IN ('database', 'realtime', 'api', 'frontend', 'notifications')),
  status text NOT NULL CHECK (status IN ('healthy', 'degraded', 'unhealthy', 'maintenance')),
  message text,
  metrics jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ===========================================
-- V3.5 INDEXES
-- ===========================================

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- Moderation indexes
CREATE INDEX IF NOT EXISTS idx_moderation_flags_status ON moderation_flags(status);
CREATE INDEX IF NOT EXISTS idx_moderation_flags_type ON moderation_flags(flag_type);
CREATE INDEX IF NOT EXISTS idx_moderation_flags_session ON moderation_flags(session_id);
CREATE INDEX IF NOT EXISTS idx_moderation_flags_created ON moderation_flags(created_at DESC);

-- Admin actions indexes
CREATE INDEX IF NOT EXISTS idx_admin_actions_admin ON admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_actions_type ON admin_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_actions_created ON admin_actions(created_at DESC);

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at DESC);

-- System health indexes
CREATE INDEX IF NOT EXISTS idx_system_health_component ON system_health(component);
CREATE INDEX IF NOT EXISTS idx_system_health_status ON system_health(status);
CREATE INDEX IF NOT EXISTS idx_system_health_created ON system_health(created_at DESC);

-- ===========================================
-- V3.5 ROW LEVEL SECURITY POLICIES
-- ===========================================

-- Enable RLS on new tables
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_health ENABLE ROW LEVEL SECURITY;

-- Notifications: Users can only see their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Moderation flags: Moderators and admins can view all, users can only see flags on their sessions
CREATE POLICY "Moderators can view all flags" ON moderation_flags
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('moderator')
    )
  );

CREATE POLICY "Users can view flags on their sessions" ON moderation_flags
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM sessions WHERE participant_id = auth.uid() OR counselor_id = auth.uid()
    )
  );

-- Admin actions: Only moderators can view
CREATE POLICY "Moderators can view admin actions" ON admin_actions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('moderator')
    )
  );

-- Analytics: Only moderators can view (for privacy)
CREATE POLICY "Moderators can view analytics" ON analytics_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('moderator')
    )
  );

-- System health: Only moderators can view
CREATE POLICY "Moderators can view system health" ON system_health
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('moderator')
    )
  );

-- Analytics: anonymous metrics for monitoring
CREATE TABLE IF NOT EXISTS analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric text NOT NULL,
  value bigint NOT NULL DEFAULT 1,
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for analytics
CREATE INDEX IF NOT EXISTS idx_analytics_metric_date ON analytics(metric, date);

-- Function to increment analytics
CREATE OR REPLACE FUNCTION increment_analytics(metric_name text)
RETURNS void AS $$
BEGIN
  INSERT INTO analytics (metric, value, date)
  VALUES (metric_name, 1, CURRENT_DATE)
  ON CONFLICT (metric, date) DO UPDATE SET
    value = analytics.value + 1;
END;
$$ LANGUAGE plpgsql;

-- V3: Emotional signals for analysis
CREATE TABLE IF NOT EXISTS emotional_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  sadness_score float CHECK (sadness_score BETWEEN 0 AND 1),
  distress_score float CHECK (distress_score BETWEEN 0 AND 1),
  risk_level text CHECK (risk_level IN ('low', 'medium', 'high', 'crisis')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- V3: Crisis alerts for immediate attention
CREATE TABLE IF NOT EXISTS crisis_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  alert_type text NOT NULL CHECK (alert_type IN ('self_harm', 'suicidal', 'despair', 'panic')),
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status text NOT NULL CHECK (status IN ('active', 'resolved', 'dismissed')) DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

-- V3: Moderation flags for abuse detection
CREATE TABLE IF NOT EXISTS moderation_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  flag_type text NOT NULL CHECK (flag_type IN ('romantic', 'sexual', 'predatory', 'spam')),
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  status text NOT NULL CHECK (status IN ('pending', 'reviewed', 'actioned')) DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- V3: Support rooms for group discussions
CREATE TABLE IF NOT EXISTS support_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text NOT NULL CHECK (category IN ('heartbreak', 'loneliness', 'stress', 'general')),
  is_active boolean NOT NULL DEFAULT true,
  moderator_id uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- V3: Messages in support rooms
CREATE TABLE IF NOT EXISTS support_room_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES support_rooms(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_flagged boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ===========================================
-- VERSION 4 SCHEMA EXTENSIONS
-- ===========================================

-- Crisis alerts for safety protocol escalation
CREATE TABLE IF NOT EXISTS crisis_alerts_v4 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  alert_type text NOT NULL CHECK (alert_type IN ('self_harm', 'suicidal_ideation', 'extreme_distress', 'panic_attack', 'emotional_crisis')),
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  status text NOT NULL CHECK (status IN ('active', 'escalated', 'resolved', 'dismissed')) DEFAULT 'active',
  detection_method text NOT NULL CHECK (detection_method IN ('keyword_pattern', 'sentiment_analysis', 'manual_report', 'behavioral_pattern')),
  risk_indicators jsonb DEFAULT '{}'::jsonb,
  assigned_counselor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  moderator_notified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  escalated_at timestamptz,
  resolved_at timestamptz,
  resolution_notes text
);

-- Support circles (group rooms) for community support
CREATE TABLE IF NOT EXISTS support_rooms_v4 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  category text NOT NULL CHECK (category IN ('heartbreak_recovery', 'loneliness_support', 'stress_management', 'grief_support', 'relationship_advice', 'emotional_wellness')),
  is_active boolean NOT NULL DEFAULT true,
  is_moderated boolean NOT NULL DEFAULT true,
  moderator_id uuid REFERENCES users(id) ON DELETE SET NULL,
  max_participants int DEFAULT 50,
  rules text,
  guidelines jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Messages in support rooms with enhanced moderation
CREATE TABLE IF NOT EXISTS support_room_messages_v4 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES support_rooms_v4(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL,
  content_hash text NOT NULL, -- For spam detection
  is_flagged boolean NOT NULL DEFAULT false,
  flag_reason text,
  moderated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  moderated_at timestamptz,
  moderation_action text CHECK (moderation_action IN ('approved', 'edited', 'removed', 'banned')),
  reply_to_id uuid REFERENCES support_room_messages_v4(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  edited_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Counselor verification and training system
CREATE TABLE IF NOT EXISTS counselor_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  verification_status text NOT NULL CHECK (verification_status IN ('pending', 'verified', 'rejected', 'suspended')) DEFAULT 'pending',
  training_completed boolean NOT NULL DEFAULT false,
  training_modules jsonb DEFAULT '[]'::jsonb,
  specialization_areas text[] DEFAULT '{}',
  years_experience int,
  certifications text[] DEFAULT '{}',
  background_check_status text CHECK (background_check_status IN ('pending', 'approved', 'rejected')),
  emergency_training boolean NOT NULL DEFAULT false,
  crisis_training boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Counselor session statistics and performance
CREATE TABLE IF NOT EXISTS counselor_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  counselor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  sessions_handled int NOT NULL DEFAULT 0,
  avg_response_time_seconds int,
  total_response_time_seconds int NOT NULL DEFAULT 0,
  messages_sent int NOT NULL DEFAULT 0,
  messages_received int NOT NULL DEFAULT 0,
  sessions_completed int NOT NULL DEFAULT 0,
  sessions_abandoned int NOT NULL DEFAULT 0,
  crisis_alerts_handled int NOT NULL DEFAULT 0,
  avg_session_duration_minutes int,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Anonymous counselor feedback and reputation system
CREATE TABLE IF NOT EXISTS counselor_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  counselor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  helpfulness_rating int CHECK (helpfulness_rating BETWEEN 1 AND 5),
  response_quality_rating int CHECK (response_quality_rating BETWEEN 1 AND 5),
  empathy_rating int CHECK (empathy_rating BETWEEN 1 AND 5),
  overall_rating int CHECK (overall_rating BETWEEN 1 AND 5),
  session_completion_rating int CHECK (session_completion_rating BETWEEN 1 AND 5),
  feedback_text text,
  is_anonymous boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Research metrics for academic studies (fully anonymous)
CREATE TABLE IF NOT EXISTS research_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id text NOT NULL, -- Identifier for the research study
  metric_type text NOT NULL CHECK (metric_type IN ('mood_trend', 'session_duration', 'conversation_frequency', 'emotional_pattern', 'engagement_level', 'recovery_progress', 'support_circle_participation')),
  anonymous_participant_id text NOT NULL, -- Hashed/anonymized identifier
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  collection_date date NOT NULL DEFAULT CURRENT_DATE,
  approved_by_institution boolean NOT NULL DEFAULT false,
  data_retention_days int DEFAULT 2555, -- ~7 years for longitudinal studies
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz GENERATED ALWAYS AS (created_at + INTERVAL '1 day' * data_retention_days) STORED
);

-- Crisis resource library
CREATE TABLE IF NOT EXISTS crisis_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL CHECK (category IN ('coping_strategies', 'breathing_exercises', 'stress_reduction', 'self_care', 'emergency_contacts', 'professional_help', 'peer_support')),
  content_type text NOT NULL CHECK (content_type IN ('article', 'guide', 'exercise', 'video', 'audio', 'infographic')),
  content text NOT NULL,
  summary text,
  tags text[] DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  access_level text NOT NULL CHECK (access_level IN ('public', 'authenticated', 'crisis_only')) DEFAULT 'public',
  view_count int NOT NULL DEFAULT 0,
  helpful_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Rate limiting for security
CREATE TABLE IF NOT EXISTS rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL, -- IP hash or user ID hash
  action_type text NOT NULL CHECK (action_type IN ('message_send', 'session_start', 'api_request', 'login_attempt')),
  window_start timestamptz NOT NULL,
  request_count int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Anti-spam measures
CREATE TABLE IF NOT EXISTS spam_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_type text NOT NULL CHECK (pattern_type IN ('content_hash', 'ip_address', 'user_behavior', 'message_pattern')),
  pattern_value text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high')) DEFAULT 'medium',
  is_active boolean NOT NULL DEFAULT true,
  detection_count int NOT NULL DEFAULT 0,
  last_detected_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Message encryption keys (optional feature)
CREATE TABLE IF NOT EXISTS encryption_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  key_version int NOT NULL DEFAULT 1,
  public_key text NOT NULL,
  encrypted_private_key text NOT NULL, -- Encrypted with user's recovery key
  algorithm text NOT NULL DEFAULT 'AES-256-GCM',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

-- Mobile app/PWA support
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);

-- Enhanced analytics for V4 monitoring
CREATE TABLE IF NOT EXISTS platform_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  metric_unit text,
  collection_period text NOT NULL CHECK (collection_period IN ('minute', 'hour', 'day', 'week', 'month')),
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  dimensions jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ===========================================
-- V4 INDEXES
-- ===========================================

-- Crisis alerts indexes
CREATE INDEX IF NOT EXISTS idx_crisis_alerts_v4_status ON crisis_alerts_v4(status);
CREATE INDEX IF NOT EXISTS idx_crisis_alerts_v4_severity ON crisis_alerts_v4(severity);
CREATE INDEX IF NOT EXISTS idx_crisis_alerts_v4_session ON crisis_alerts_v4(session_id);
CREATE INDEX IF NOT EXISTS idx_crisis_alerts_v4_user ON crisis_alerts_v4(user_id);
CREATE INDEX IF NOT EXISTS idx_crisis_alerts_v4_created ON crisis_alerts_v4(created_at DESC);

-- Support rooms indexes
CREATE INDEX IF NOT EXISTS idx_support_rooms_v4_category ON support_rooms_v4(category);
CREATE INDEX IF NOT EXISTS idx_support_rooms_v4_active ON support_rooms_v4(is_active);
CREATE INDEX IF NOT EXISTS idx_support_rooms_v4_moderator ON support_rooms_v4(moderator_id);

-- Support room messages indexes
CREATE INDEX IF NOT EXISTS idx_support_room_messages_v4_room ON support_room_messages_v4(room_id);
CREATE INDEX IF NOT EXISTS idx_support_room_messages_v4_sender ON support_room_messages_v4(sender_id);
CREATE INDEX IF NOT EXISTS idx_support_room_messages_v4_flagged ON support_room_messages_v4(is_flagged);
CREATE INDEX IF NOT EXISTS idx_support_room_messages_v4_created ON support_room_messages_v4(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_room_messages_v4_hash ON support_room_messages_v4(content_hash);

-- Counselor profiles indexes
CREATE INDEX IF NOT EXISTS idx_counselor_profiles_user ON counselor_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_counselor_profiles_status ON counselor_profiles(verification_status);
CREATE INDEX IF NOT EXISTS idx_counselor_profiles_training ON counselor_profiles(training_completed);

-- Counselor stats indexes
CREATE INDEX IF NOT EXISTS idx_counselor_stats_counselor ON counselor_stats(counselor_id);
CREATE INDEX IF NOT EXISTS idx_counselor_stats_period ON counselor_stats(period_start, period_end);

-- Counselor feedback indexes
CREATE INDEX IF NOT EXISTS idx_counselor_feedback_counselor ON counselor_feedback(counselor_id);
CREATE INDEX IF NOT EXISTS idx_counselor_feedback_session ON counselor_feedback(session_id);
CREATE INDEX IF NOT EXISTS idx_counselor_feedback_rating ON counselor_feedback(overall_rating);

-- Research metrics indexes
CREATE INDEX IF NOT EXISTS idx_research_metrics_study ON research_metrics(study_id);
CREATE INDEX IF NOT EXISTS idx_research_metrics_type ON research_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_research_metrics_participant ON research_metrics(anonymous_participant_id);
CREATE INDEX IF NOT EXISTS idx_research_metrics_date ON research_metrics(collection_date);
CREATE INDEX IF NOT EXISTS idx_research_metrics_expires ON research_metrics(expires_at);

-- Crisis resources indexes
CREATE INDEX IF NOT EXISTS idx_crisis_resources_category ON crisis_resources(category);
CREATE INDEX IF NOT EXISTS idx_crisis_resources_active ON crisis_resources(is_active);
CREATE INDEX IF NOT EXISTS idx_crisis_resources_access ON crisis_resources(access_level);

-- Rate limiting indexes
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON rate_limits(identifier);
CREATE INDEX IF NOT EXISTS idx_rate_limits_action ON rate_limits(action_type);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);

-- Spam patterns indexes
CREATE INDEX IF NOT EXISTS idx_spam_patterns_type ON spam_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_spam_patterns_value ON spam_patterns(pattern_value);
CREATE INDEX IF NOT EXISTS idx_spam_patterns_active ON spam_patterns(is_active);

-- Encryption keys indexes
CREATE INDEX IF NOT EXISTS idx_encryption_keys_session ON encryption_keys(session_id);
CREATE INDEX IF NOT EXISTS idx_encryption_keys_active ON encryption_keys(is_active);

-- Push subscriptions indexes
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(is_active);

-- Platform metrics indexes
CREATE INDEX IF NOT EXISTS idx_platform_metrics_name ON platform_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_platform_metrics_period ON platform_metrics(collection_period, period_start);

-- ===========================================
-- V4 ROW LEVEL SECURITY POLICIES
-- ===========================================

-- Enable RLS on all V4 tables
ALTER TABLE crisis_alerts_v4 ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_rooms_v4 ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_room_messages_v4 ENABLE ROW LEVEL SECURITY;
ALTER TABLE counselor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE counselor_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE counselor_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE crisis_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE spam_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE encryption_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_metrics ENABLE ROW LEVEL SECURITY;

-- Crisis alerts: Moderators can view all, counselors can view assigned alerts
CREATE POLICY "Moderators can view all crisis alerts" ON crisis_alerts_v4
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('moderator')
    )
  );

CREATE POLICY "Counselors can view assigned crisis alerts" ON crisis_alerts_v4
  FOR SELECT USING (
    assigned_counselor_id = auth.uid()
  );

-- Support rooms: Public read for active rooms, moderators can manage
CREATE POLICY "Users can view active support rooms" ON support_rooms_v4
  FOR SELECT USING (is_active = true);

CREATE POLICY "Moderators can manage support rooms" ON support_rooms_v4
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('moderator')
    )
  );

-- Support room messages: Users can view messages in rooms they're participating in
CREATE POLICY "Users can view support room messages" ON support_room_messages_v4
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM support_rooms_v4 sr
      WHERE sr.id = room_id AND sr.is_active = true
    )
  );

CREATE POLICY "Users can insert support room messages" ON support_room_messages_v4
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM support_rooms_v4 sr
      WHERE sr.id = room_id AND sr.is_active = true
    )
  );

-- Counselor profiles: Counselors can view their own, moderators can view all
CREATE POLICY "Counselors can view own profile" ON counselor_profiles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Counselors can update own profile" ON counselor_profiles
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Moderators can view all counselor profiles" ON counselor_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('moderator')
    )
  );

-- Counselor stats: Counselors can view their own, moderators can view all
CREATE POLICY "Counselors can view own stats" ON counselor_stats
  FOR SELECT USING (counselor_id = auth.uid());

CREATE POLICY "Moderators can view all counselor stats" ON counselor_stats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('moderator')
    )
  );

-- Counselor feedback: Participants can submit feedback, counselors can view their own
CREATE POLICY "Participants can submit feedback" ON counselor_feedback
  FOR INSERT WITH CHECK (participant_id = auth.uid());

CREATE POLICY "Counselors can view own feedback" ON counselor_feedback
  FOR SELECT USING (counselor_id = auth.uid());

CREATE POLICY "Moderators can view all feedback" ON counselor_feedback
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('moderator')
    )
  );

-- Research metrics: Only moderators can access (for privacy)
CREATE POLICY "Moderators can access research metrics" ON research_metrics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('moderator')
    )
  );

-- Crisis resources: Public access for public resources, authenticated for others
CREATE POLICY "Public crisis resources" ON crisis_resources
  FOR SELECT USING (access_level = 'public' AND is_active = true);

CREATE POLICY "Authenticated crisis resources" ON crisis_resources
  FOR SELECT USING (
    access_level = 'authenticated' AND is_active = true AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Crisis-only resources for authenticated users" ON crisis_resources
  FOR SELECT USING (
    access_level = 'crisis_only' AND is_active = true AND auth.uid() IS NOT NULL
  );

-- Rate limits: Only moderators can view
CREATE POLICY "Moderators can view rate limits" ON rate_limits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('moderator')
    )
  );

-- Spam patterns: Only moderators can manage
CREATE POLICY "Moderators can manage spam patterns" ON spam_patterns
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('moderator')
    )
  );

-- Encryption keys: Users can view their session keys
CREATE POLICY "Users can view own encryption keys" ON encryption_keys
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM sessions WHERE participant_id = auth.uid() OR counselor_id = auth.uid()
    )
  );

-- Push subscriptions: Users can manage their own
CREATE POLICY "Users can manage own push subscriptions" ON push_subscriptions
  FOR ALL USING (user_id = auth.uid());

-- Platform metrics: Only moderators can view
CREATE POLICY "Moderators can view platform metrics" ON platform_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('moderator')
    )
  );

-- ===========================================
-- V4 HELPER FUNCTIONS
-- ===========================================

-- Function to detect crisis patterns in messages
CREATE OR REPLACE FUNCTION detect_crisis_patterns(message_text text)
RETURNS jsonb AS $$
DECLARE
  result jsonb := '{}'::jsonb;
  self_harm_keywords text[] := ARRAY['kill myself', 'end it all', 'not worth living', 'better off dead', 'want to die', 'suicide', 'self harm', 'cut myself'];
  suicidal_keywords text[] := ARRAY['suicidal', 'suicide attempt', 'plan to kill', 'end my life', 'no reason to live'];
  distress_keywords text[] := ARRAY['can''t go on', 'breaking point', 'falling apart', 'losing control', 'overwhelmed', 'hopeless'];
BEGIN
  -- Check for self-harm indicators
  IF message_text ~* ANY(self_harm_keywords) THEN
    result := jsonb_set(result, '{self_harm}', 'true');
  END IF;

  -- Check for suicidal ideation
  IF message_text ~* ANY(suicidal_keywords) THEN
    result := jsonb_set(result, '{suicidal_ideation}', 'true');
  END IF;

  -- Check for extreme distress
  IF message_text ~* ANY(distress_keywords) THEN
    result := jsonb_set(result, '{extreme_distress}', 'true');
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to check rate limits
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier text,
  p_action_type text,
  p_window_minutes int DEFAULT 1,
  p_max_requests int DEFAULT 10
)
RETURNS boolean AS $$
DECLARE
  window_start timestamptz;
  current_count int;
BEGIN
  window_start := date_trunc('minute', now()) - INTERVAL '1 minute' * (extract(minute from now()) % p_window_minutes);

  SELECT COALESCE(SUM(request_count), 0)
  INTO current_count
  FROM rate_limits
  WHERE identifier = p_identifier
    AND action_type = p_action_type
    AND window_start >= window_start;

  IF current_count >= p_max_requests THEN
    RETURN false;
  END IF;

  -- Insert or update rate limit record
  INSERT INTO rate_limits (identifier, action_type, window_start, request_count)
  VALUES (p_identifier, p_action_type, window_start, 1)
  ON CONFLICT (identifier, action_type, window_start)
  DO UPDATE SET
    request_count = rate_limits.request_count + 1,
    updated_at = now();

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate counselor reputation score
CREATE OR REPLACE FUNCTION calculate_counselor_reputation(counselor_uuid uuid)
RETURNS numeric AS $$
DECLARE
  avg_helpfulness numeric;
  avg_quality numeric;
  avg_empathy numeric;
  avg_completion numeric;
  total_ratings int;
  reputation_score numeric;
BEGIN
  SELECT
    AVG(helpfulness_rating),
    AVG(response_quality_rating),
    AVG(empathy_rating),
    AVG(session_completion_rating),
    COUNT(*)
  INTO avg_helpfulness, avg_quality, avg_empathy, avg_completion, total_ratings
  FROM counselor_feedback
  WHERE counselor_id = counselor_uuid
    AND created_at >= now() - INTERVAL '90 days';

  IF total_ratings < 5 THEN
    RETURN 0; -- Not enough ratings for reputation
  END IF;

  -- Weighted reputation score (0-100)
  reputation_score := (
    (avg_helpfulness * 0.3) +
    (avg_quality * 0.25) +
    (avg_empathy * 0.25) +
    (avg_completion * 0.2)
  ) * 20; -- Scale to 0-100

  RETURN LEAST(100, GREATEST(0, reputation_score));
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to anonymize research data
CREATE OR REPLACE FUNCTION anonymize_participant_id(user_uuid uuid)
RETURNS text AS $$
BEGIN
  -- Create a consistent hash of the user ID for research purposes
  -- This ensures the same user always gets the same anonymous ID
  RETURN encode(digest(user_uuid::text || 'research_salt_2024', 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;
