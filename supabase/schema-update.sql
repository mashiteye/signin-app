-- ============================================================
-- SignIn App - Supabase Schema
-- Project: wryevlgmsrzlzzypnkaf (eu-west-1)
-- Run this in Supabase SQL Editor if tables need updates
-- ============================================================

-- Phase 1 tables should already exist. This adds the event_code
-- column needed for public attendance links if missing.

-- Add event_code to events table (for public /attend/:code URLs)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'event_code'
  ) THEN
    ALTER TABLE events ADD COLUMN event_code text UNIQUE;
  END IF;
END $$;

-- Verify all required columns exist
-- Run this as a check:
/*
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN ('organizations','profiles','events','participants','attendance','audit_log')
ORDER BY table_name, ordinal_position;
*/

-- ============================================================
-- RLS POLICIES for public attendance (no auth)
-- ============================================================

-- Allow anyone to READ events by event_code (for the public attend page)
CREATE POLICY IF NOT EXISTS "Anyone can read events by code"
  ON events FOR SELECT
  USING (true);

-- Allow anyone to READ participants for an event (for search on tablets)
CREATE POLICY IF NOT EXISTS "Anyone can read participants"
  ON participants FOR SELECT
  USING (true);

-- Allow anyone to READ attendance (to check duplicates on tablets)
CREATE POLICY IF NOT EXISTS "Anyone can read attendance"
  ON attendance FOR SELECT
  USING (true);

-- Allow anyone to INSERT attendance (tablet submissions)
CREATE POLICY IF NOT EXISTS "Anyone can insert attendance"
  ON attendance FOR INSERT
  WITH CHECK (true);

-- Allow anyone to INSERT participants (walk-in registration)
CREATE POLICY IF NOT EXISTS "Anyone can insert participants"
  ON participants FOR INSERT
  WITH CHECK (true);

-- Allow anyone to read org name (shown in header)
CREATE POLICY IF NOT EXISTS "Anyone can read org names"
  ON organizations FOR SELECT
  USING (true);

-- ============================================================
-- Storage: signatures bucket
-- ============================================================
-- Make the signatures bucket PUBLIC so signature URLs work
-- Go to Supabase Dashboard > Storage > signatures bucket > Policies
-- Add policy: Allow public read access (SELECT) to all files
-- Add policy: Allow anonymous uploads (INSERT) to all files

-- Or run:
-- INSERT INTO storage.policies (name, bucket_id, definition)
-- VALUES ('Public read', 'signatures', '{"SELECT": true}');
