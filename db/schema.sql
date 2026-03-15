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

-- Match history for analytics and research
CREATE TABLE IF NOT EXISTS match_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  participant_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  counselor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  matched_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  outcome text CHECK (outcome IN ('completed', 'dropped', 'reported', 'panic')),
  metadata jsonb DEFAULT '{}'::jsonb
);

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

-- Aggregate mood trends (for counselor dashboards/insights)
CREATE OR REPLACE FUNCTION mood_trend_summary()
RETURNS TABLE(mood text, count bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT mood, COUNT(*)
  FROM mood_logs
  GROUP BY mood
  ORDER BY COUNT(*) DESC;
END;
$$ LANGUAGE plpgsql STABLE;
