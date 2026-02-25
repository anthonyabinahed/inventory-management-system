-- Create export_jobs table for tracking background Excel export jobs
CREATE TABLE export_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  options JSONB NOT NULL DEFAULT '{}',
  -- options shape: { include_empty_lots: boolean, include_expired_lots: boolean }
  file_path TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE export_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own export jobs"
  ON export_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own export jobs"
  ON export_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- The Edge Function updates job status using the service role key (bypasses RLS).
-- No UPDATE policy for users — status transitions are managed server-side only.

-- Create private exports storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('exports', 'exports', false, 52428800); -- 50 MiB

-- Storage policy: users can only read files under their own user_id folder
CREATE POLICY "Users can read own export files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'exports'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policy: service role handles inserts (Edge Function uses service role key)
-- No INSERT policy for users — files are written server-side only.
