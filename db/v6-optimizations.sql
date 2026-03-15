-- Solace V6: Logic Engine Database Optimizations
-- PostgreSQL optimizations for enhanced intelligence and performance

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- V6 Emotional State Tracking
CREATE TABLE IF NOT EXISTS emotional_states_v6 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  current_state text NOT NULL CHECK (current_state IN ('stable', 'recovering', 'distressed', 'high_risk')),
  confidence float NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  signals jsonb NOT NULL DEFAULT '{}',
  trends jsonb NOT NULL DEFAULT '{}',
  last_updated timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- V6 Session Intelligence
CREATE TABLE IF NOT EXISTS session_intelligence_v6 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  continuity_score float NOT NULL CHECK (continuity_score >= 0 AND continuity_score <= 1),
  fatigue_indicators jsonb NOT NULL DEFAULT '{}',
  recommendations jsonb NOT NULL DEFAULT '{}',
  patterns jsonb NOT NULL DEFAULT '{}',
  last_analyzed timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- V6 Panic Alerts with Enhanced Intelligence
CREATE TABLE IF NOT EXISTS panic_alerts_v6 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  level int NOT NULL CHECK (level IN (1, 2, 3)),
  triggered_by text NOT NULL CHECK (triggered_by IN ('user_button', 'auto_detection')),
  emotional_state text NOT NULL CHECK (emotional_state IN ('stable', 'recovering', 'distressed', 'high_risk')),
  risk_level text NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  assigned_counselor uuid REFERENCES users(id),
  status text NOT NULL CHECK (status IN ('active', 'assigned', 'resolved')) DEFAULT 'active',
  resolved_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  metadata jsonb DEFAULT '{}'
);

-- V6 Counselor Performance Metrics
CREATE TABLE IF NOT EXISTS counselor_metrics_v6 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  counselor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  sessions_completed int NOT NULL DEFAULT 0,
  average_session_duration float,
  panic_alerts_handled int NOT NULL DEFAULT 0,
  user_satisfaction float CHECK (user_satisfaction >= 0 AND user_satisfaction <= 5),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(counselor_id, date)
);

-- V6 Platform Analytics Cache
CREATE TABLE IF NOT EXISTS platform_analytics_v6 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type text NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  value jsonb NOT NULL,
  calculated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '1 hour'),
  UNIQUE(metric_type, date)
);

-- Performance Optimization Indexes

-- Emotional States
CREATE INDEX IF NOT EXISTS idx_emotional_states_user_updated ON emotional_states_v6(user_id, last_updated DESC);
CREATE INDEX IF NOT EXISTS idx_emotional_states_state ON emotional_states_v6(current_state);

-- Session Intelligence
CREATE INDEX IF NOT EXISTS idx_session_intelligence_session ON session_intelligence_v6(session_id);
CREATE INDEX IF NOT EXISTS idx_session_intelligence_analyzed ON session_intelligence_v6(last_analyzed DESC);

-- Panic Alerts V6
CREATE INDEX IF NOT EXISTS idx_panic_alerts_v6_status_created ON panic_alerts_v6(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_panic_alerts_v6_level ON panic_alerts_v6(level);
CREATE INDEX IF NOT EXISTS idx_panic_alerts_v6_assigned ON panic_alerts_v6(assigned_counselor) WHERE assigned_counselor IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_panic_alerts_v6_user ON panic_alerts_v6(user_id);

-- Counselor Metrics
CREATE INDEX IF NOT EXISTS idx_counselor_metrics_counselor_date ON counselor_metrics_v6(counselor_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_counselor_metrics_date ON counselor_metrics_v6(date);

-- Platform Analytics
CREATE INDEX IF NOT EXISTS idx_platform_analytics_type_date ON platform_analytics_v6(metric_type, date);
CREATE INDEX IF NOT EXISTS idx_platform_analytics_expires ON platform_analytics_v6(expires_at);

-- Enhanced Existing Table Indexes

-- Sessions (additional indexes for V6 logic)
CREATE INDEX IF NOT EXISTS idx_sessions_counselor_status ON sessions(counselor_id, status) WHERE counselor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_participant_recent ON sessions(participant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_duration ON sessions(created_at, ended_at) WHERE ended_at IS NOT NULL;

-- Messages (for sentiment analysis and pattern detection)
CREATE INDEX IF NOT EXISTS idx_messages_session_created ON messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender_created ON messages(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_flagged ON messages(is_flagged) WHERE is_flagged = true;

-- Mood Logs (for emotional state calculations)
CREATE INDEX IF NOT EXISTS idx_mood_logs_user_date ON mood_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mood_logs_recent ON mood_logs(created_at DESC);

-- Users (for counselor matching)
CREATE INDEX IF NOT EXISTS idx_users_role_active ON users(role, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen_at DESC) WHERE is_active = true;

-- Optimized Views for Common Queries

-- Active Sessions with Intelligence
CREATE OR REPLACE VIEW active_sessions_intelligence AS
SELECT
  s.id,
  s.participant_id,
  s.counselor_id,
  s.status,
  s.created_at,
  s.panic,
  si.continuity_score,
  si.fatigue_indicators,
  si.recommendations,
  EXTRACT(EPOCH FROM (now() - s.created_at)) / 60 as duration_minutes,
  COUNT(m.id) as message_count
FROM sessions s
LEFT JOIN session_intelligence_v6 si ON s.id = si.session_id
LEFT JOIN messages m ON s.id = m.session_id
WHERE s.status = 'active'
GROUP BY s.id, s.participant_id, s.counselor_id, s.status, s.created_at, s.panic, si.continuity_score, si.fatigue_indicators, si.recommendations;

-- Counselor Workload View
CREATE OR REPLACE VIEW counselor_workload AS
SELECT
  u.id,
  u.anonymous_label,
  COUNT(s.id) as active_sessions,
  COUNT(CASE WHEN s.created_at >= CURRENT_DATE THEN 1 END) as sessions_today,
  AVG(EXTRACT(EPOCH FROM (s.ended_at - s.created_at)) / 60) as avg_session_duration,
  COUNT(pa.id) as active_panic_alerts
FROM users u
LEFT JOIN sessions s ON u.id = s.counselor_id AND s.status = 'active'
LEFT JOIN panic_alerts_v6 pa ON u.id = pa.assigned_counselor AND pa.status = 'active'
WHERE u.role = 'counselor' AND u.is_active = true
GROUP BY u.id, u.anonymous_label;

-- User Emotional Health Summary
CREATE OR REPLACE VIEW user_emotional_health AS
SELECT
  u.id,
  es.current_state,
  es.confidence,
  es.signals,
  es.trends,
  COUNT(DISTINCT s.id) as total_sessions,
  COUNT(DISTINCT CASE WHEN s.status = 'ended' THEN s.id END) as completed_sessions,
  MAX(s.created_at) as last_session_date,
  COUNT(pa.id) as panic_alerts_count
FROM users u
LEFT JOIN emotional_states_v6 es ON u.id = es.user_id
LEFT JOIN sessions s ON u.id = s.participant_id
LEFT JOIN panic_alerts_v6 pa ON u.id = pa.user_id
WHERE u.role = 'participant'
GROUP BY u.id, es.current_state, es.confidence, es.signals, es.trends;

-- Performance Monitoring Functions

-- Function to update emotional state
CREATE OR REPLACE FUNCTION update_emotional_state(
  p_user_id uuid,
  p_state text,
  p_confidence float,
  p_signals jsonb,
  p_trends jsonb
) RETURNS uuid AS $$
DECLARE
  state_id uuid;
BEGIN
  INSERT INTO emotional_states_v6 (user_id, current_state, confidence, signals, trends)
  VALUES (p_user_id, p_state, p_confidence, p_signals, p_trends)
  ON CONFLICT (user_id)
  DO UPDATE SET
    current_state = EXCLUDED.current_state,
    confidence = EXCLUDED.confidence,
    signals = EXCLUDED.signals,
    trends = EXCLUDED.trends,
    last_updated = now()
  RETURNING id INTO state_id;

  RETURN state_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get counselor availability score
CREATE OR REPLACE FUNCTION get_counselor_availability_score(p_counselor_id uuid)
RETURNS float AS $$
DECLARE
  active_sessions int;
  last_seen_minutes int;
  availability_score float;
BEGIN
  -- Count active sessions
  SELECT COUNT(*) INTO active_sessions
  FROM sessions
  WHERE counselor_id = p_counselor_id AND status = 'active';

  -- Calculate minutes since last seen
  SELECT EXTRACT(EPOCH FROM (now() - last_seen_at)) / 60 INTO last_seen_minutes
  FROM users
  WHERE id = p_counselor_id;

  -- Calculate availability score (0-1, higher is better)
  IF last_seen_minutes > 30 THEN
    availability_score := 0; -- Offline
  ELSIF active_sessions >= 4 THEN
    availability_score := 0.2; -- Overloaded
  ELSIF active_sessions >= 2 THEN
    availability_score := 0.6; -- Busy
  ELSIF active_sessions = 1 THEN
    availability_score := 0.9; -- Good load
  ELSE
    availability_score := 1.0; -- Available
  END IF;

  RETURN availability_score;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate session continuity
CREATE OR REPLACE FUNCTION calculate_session_continuity(p_session_id uuid)
RETURNS float AS $$
DECLARE
  message_count int;
  avg_response_time float;
  duration_minutes float;
  continuity_score float;
BEGIN
  -- Get basic session metrics
  SELECT
    COUNT(m.id),
    AVG(EXTRACT(EPOCH FROM (m.created_at - lag(m.created_at) OVER (ORDER BY m.created_at))) / 60),
    EXTRACT(EPOCH FROM (now() - s.created_at)) / 60
  INTO message_count, avg_response_time, duration_minutes
  FROM sessions s
  LEFT JOIN messages m ON s.id = m.session_id
  WHERE s.id = p_session_id
  GROUP BY s.id;

  -- Calculate continuity score
  continuity_score := 0;

  -- Message frequency (balanced conversation)
  IF message_count > 0 AND duration_minutes > 0 THEN
    continuity_score := continuity_score + LEAST(message_count / (duration_minutes / 30), 1) * 0.4;
  END IF;

  -- Response time consistency
  IF avg_response_time IS NOT NULL THEN
    IF avg_response_time < 30 THEN
      continuity_score := continuity_score + 0.3;
    ELSIF avg_response_time < 60 THEN
      continuity_score := continuity_score + 0.2;
    ELSE
      continuity_score := continuity_score + 0.1;
    END IF;
  END IF;

  -- Session duration factor
  IF duration_minutes > 10 AND duration_minutes < 120 THEN
    continuity_score := continuity_score + 0.3;
  END IF;

  RETURN LEAST(continuity_score, 1.0);
END;
$$ LANGUAGE plpgsql;

-- Automated Cleanup Functions

-- Clean up expired analytics cache
CREATE OR REPLACE FUNCTION cleanup_expired_analytics() RETURNS void AS $$
BEGIN
  DELETE FROM platform_analytics_v6 WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- Update counselor daily metrics
CREATE OR REPLACE FUNCTION update_counselor_daily_metrics(p_counselor_id uuid, p_date date DEFAULT CURRENT_DATE)
RETURNS void AS $$
DECLARE
  sessions_completed int;
  avg_duration float;
  panic_handled int;
BEGIN
  -- Calculate metrics for the day
  SELECT
    COUNT(*),
    AVG(EXTRACT(EPOCH FROM (ended_at - created_at)) / 60),
    COUNT(pa.id)
  INTO sessions_completed, avg_duration, panic_handled
  FROM sessions s
  LEFT JOIN panic_alerts_v6 pa ON s.id = pa.session_id AND pa.assigned_counselor = p_counselor_id
  WHERE s.counselor_id = p_counselor_id
    AND DATE(s.created_at) = p_date
    AND s.status = 'ended';

  -- Insert or update metrics
  INSERT INTO counselor_metrics_v6 (
    counselor_id, date, sessions_completed, average_session_duration, panic_alerts_handled
  ) VALUES (
    p_counselor_id, p_date, sessions_completed, avg_duration, panic_handled
  )
  ON CONFLICT (counselor_id, date)
  DO UPDATE SET
    sessions_completed = EXCLUDED.sessions_completed,
    average_session_duration = EXCLUDED.average_session_duration,
    panic_alerts_handled = EXCLUDED.panic_alerts_handled;
END;
$$ LANGUAGE plpgsql;

-- Create maintenance job (to be run by external scheduler)
-- This would typically be handled by pg_cron or similar

-- Performance monitoring view
CREATE OR REPLACE VIEW performance_metrics AS
SELECT
  'database' as metric_type,
  jsonb_build_object(
    'active_connections', (SELECT count(*) FROM pg_stat_activity),
    'cache_hit_ratio', (SELECT sum(blks_hit) / (sum(blks_hit) + sum(blks_read)) FROM pg_stat_database),
    'avg_query_time', (SELECT avg(total_time) FROM pg_stat_statements)
  ) as value,
  now() as measured_at
UNION ALL
SELECT
  'platform' as metric_type,
  jsonb_build_object(
    'active_sessions', (SELECT count(*) FROM sessions WHERE status = 'active'),
    'active_panic_alerts', (SELECT count(*) FROM panic_alerts_v6 WHERE status = 'active'),
    'available_counselors', (SELECT count(*) FROM users WHERE role = 'counselor' AND is_active = true)
  ) as value,
  now() as measured_at;

-- Grant appropriate permissions
GRANT SELECT ON active_sessions_intelligence TO authenticated;
GRANT SELECT ON counselor_workload TO authenticated;
GRANT SELECT ON user_emotional_health TO authenticated;
GRANT SELECT ON performance_metrics TO authenticated;

-- Comments for documentation
COMMENT ON TABLE emotional_states_v6 IS 'V6 Emotional state tracking with AI-powered analysis';
COMMENT ON TABLE session_intelligence_v6 IS 'V6 Session intelligence and fatigue analysis';
COMMENT ON TABLE panic_alerts_v6 IS 'V6 Enhanced panic alert system with intelligent escalation';
COMMENT ON TABLE counselor_metrics_v6 IS 'V6 Counselor performance and workload metrics';
COMMENT ON TABLE platform_analytics_v6 IS 'V6 Cached platform analytics for performance';

COMMENT ON FUNCTION update_emotional_state IS 'Updates or inserts emotional state for a user';
COMMENT ON FUNCTION get_counselor_availability_score IS 'Calculates real-time counselor availability score';
COMMENT ON FUNCTION calculate_session_continuity IS 'Calculates session conversation continuity score';
COMMENT ON FUNCTION cleanup_expired_analytics IS 'Removes expired cached analytics data';
COMMENT ON FUNCTION update_counselor_daily_metrics IS 'Updates daily performance metrics for counselors';