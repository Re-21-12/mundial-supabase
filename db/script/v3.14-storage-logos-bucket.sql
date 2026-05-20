-- v3.14: Create public Supabase Storage bucket for logos

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'logos',
  'logos',
  true,
  2097152,
  ARRAY['image/png','image/jpeg','image/webp','image/svg+xml','image/gif']
)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'logos: public read'
  ) THEN
    EXECUTE 'CREATE POLICY "logos: public read" ON storage.objects FOR SELECT USING (bucket_id = ''logos'')';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'logos: authenticated upload'
  ) THEN
    EXECUTE 'CREATE POLICY "logos: authenticated upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = ''logos'' AND auth.role() = ''authenticated'')';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'logos: authenticated update'
  ) THEN
    EXECUTE 'CREATE POLICY "logos: authenticated update" ON storage.objects FOR UPDATE USING (bucket_id = ''logos'' AND auth.role() = ''authenticated'')';
  END IF;
END;
$$;

INSERT INTO "MIGRATION_LOG" (version, name, description, script_path, applied_at, status)
VALUES (
  'v3.14',
  'storage-logos-bucket',
  'Creates public Supabase Storage bucket logos with RLS policies for image uploads',
  'db/script/v3.14-storage-logos-bucket.sql',
  NOW(),
  'applied'
);
