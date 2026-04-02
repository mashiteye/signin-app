-- ============================================================
-- SignIn App - Phase 2 Schema Migration
-- Run this in Supabase SQL Editor
-- Project: wryevlgmsrzlzzypnkaf (eu-west-1)
-- ============================================================

-- 1. Add event_code column if missing (used for public attendance URLs)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'event_code'
  ) THEN
    ALTER TABLE events ADD COLUMN event_code TEXT UNIQUE;
  END IF;
END $$;

-- 2. Add status column to events if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'status'
  ) THEN
    ALTER TABLE events ADD COLUMN status TEXT DEFAULT 'active';
  END IF;
END $$;

-- 3. Add user_agent to attendance if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'attendance' AND column_name = 'user_agent'
  ) THEN
    ALTER TABLE attendance ADD COLUMN user_agent TEXT;
  END IF;
END $$;

-- 4. Enable RLS on all tables (idempotent)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for authenticated users (org-scoped)
-- Drop existing policies first to avoid conflicts
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN (
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public' AND policyname LIKE 'signin_%'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- Organizations: users see their own org
CREATE POLICY signin_org_select ON organizations FOR SELECT
  USING (id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY signin_org_update ON organizations FOR UPDATE
  USING (owner_id = auth.uid());

-- Profiles: users see own profile, admins can insert during signup
CREATE POLICY signin_profiles_select ON profiles FOR SELECT
  USING (id = auth.uid() OR org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY signin_profiles_insert ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY signin_profiles_update ON profiles FOR UPDATE
  USING (id = auth.uid());

-- Events: org-scoped CRUD
CREATE POLICY signin_events_select ON events FOR SELECT
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY signin_events_insert ON events FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY signin_events_update ON events FOR UPDATE
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- Participants: org-scoped via event
CREATE POLICY signin_participants_select ON participants FOR SELECT
  USING (event_id IN (SELECT id FROM events WHERE org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY signin_participants_insert ON participants FOR INSERT
  WITH CHECK (event_id IN (SELECT id FROM events WHERE org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY signin_participants_delete ON participants FOR DELETE
  USING (event_id IN (SELECT id FROM events WHERE org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())));

-- Attendance: org-scoped via event
CREATE POLICY signin_attendance_select ON attendance FOR SELECT
  USING (event_id IN (SELECT id FROM events WHERE org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY signin_attendance_insert ON attendance FOR INSERT
  WITH CHECK (event_id IN (SELECT id FROM events));

-- Audit log: org-scoped
CREATE POLICY signin_audit_select ON audit_log FOR SELECT
  USING (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY signin_audit_insert ON audit_log FOR INSERT
  WITH CHECK (org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid()));

-- 6. PUBLIC ACCESS for attendance page (anon users on tablets)
-- These allow the /attend/:code page to work without authentication

-- Anon can read events by event_code (needed to load the attendance page)
CREATE POLICY signin_events_anon_select ON events FOR SELECT
  TO anon
  USING (status = 'active');

-- Anon can read participants for active events
CREATE POLICY signin_participants_anon_select ON participants FOR SELECT
  TO anon
  USING (event_id IN (SELECT id FROM events WHERE status = 'active'));

-- Anon can read attendance for active events (to check duplicates)
CREATE POLICY signin_attendance_anon_select ON attendance FOR SELECT
  TO anon
  USING (event_id IN (SELECT id FROM events WHERE status = 'active'));

-- Anon can insert attendance (tablet sign-in)
CREATE POLICY signin_attendance_anon_insert ON attendance FOR INSERT
  TO anon
  WITH CHECK (event_id IN (SELECT id FROM events WHERE status = 'active'));

-- Anon can insert participants (walk-in registration)
CREATE POLICY signin_participants_anon_insert ON participants FOR INSERT
  TO anon
  WITH CHECK (event_id IN (SELECT id FROM events WHERE status = 'active'));

-- Anon can read organizations (to show org name on attendance page)
CREATE POLICY signin_org_anon_select ON organizations FOR SELECT
  TO anon
  USING (id IN (SELECT org_id FROM events WHERE status = 'active'));

-- 7. Storage policy for signatures bucket
-- Allow anon uploads (tablets) and authenticated reads
INSERT INTO storage.buckets (id, name, public)
VALUES ('signatures', 'signatures', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow anyone to upload to signatures bucket
CREATE POLICY signin_signatures_insert ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'signatures');

-- Allow anyone to read signatures
CREATE POLICY signin_signatures_select ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'signatures');

-- 8. Index for fast event_code lookups
CREATE INDEX IF NOT EXISTS idx_events_event_code ON events (event_code);
CREATE INDEX IF NOT EXISTS idx_attendance_event_day ON attendance (event_id, day);
CREATE INDEX IF NOT EXISTS idx_participants_event ON participants (event_id);
