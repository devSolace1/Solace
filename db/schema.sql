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

-- Indexes for V3 tables
CREATE INDEX IF NOT EXISTS idx_emotional_signals_session ON emotional_signals(session_id);
CREATE INDEX IF NOT EXISTS idx_crisis_alerts_status ON crisis_alerts(status);
CREATE INDEX IF NOT EXISTS idx_moderation_flags_status ON moderation_flags(status);
CREATE INDEX IF NOT EXISTS idx_support_room_messages_room ON support_room_messages(room_id);
