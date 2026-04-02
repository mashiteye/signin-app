-- ============================================================
-- SignIn App - Branding Migration
-- Run in Supabase SQL Editor
-- ============================================================

-- Add branding columns to organizations
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organizations' AND column_name='primary_color') THEN
    ALTER TABLE organizations ADD COLUMN primary_color text DEFAULT '#0F766E';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organizations' AND column_name='secondary_color') THEN
    ALTER TABLE organizations ADD COLUMN secondary_color text DEFAULT '#F0FDFA';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organizations' AND column_name='logo_url') THEN
    ALTER TABLE organizations ADD COLUMN logo_url text;
  END IF;
END $$;

-- Storage bucket for org logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Public read for logos
CREATE POLICY IF NOT EXISTS "Anyone can read logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'logos');

-- Authenticated users can upload their org logo
CREATE POLICY IF NOT EXISTS "Auth users can upload logos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'logos' AND auth.role() = 'authenticated');

-- Auth users can update/delete their logos
CREATE POLICY IF NOT EXISTS "Auth users can update logos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'logos' AND auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Auth users can delete logos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'logos' AND auth.role() = 'authenticated');
