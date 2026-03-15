-- Cleanup duplicate tables for Solace v0.3 to v1.0 migration

-- Drop duplicate mood_logs if exists (assuming it's a duplicate of emotional_states)
DROP TABLE IF EXISTS mood_logs;

-- Drop old panic_alerts if exists (replaced by panic_alerts_v6)
DROP TABLE IF EXISTS panic_alerts;

-- counselor_profiles is valid, no duplicate

-- Drop duplicate moderation_flags if exists
DROP TABLE IF EXISTS moderation_flags;

-- Ensure no orphaned data
-- Add any necessary data migration here if tables had data