-- Migration: Add indexing_log table
-- Date: 2026-06-28

CREATE TABLE IF NOT EXISTS public.indexing_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('URL_UPDATED', 'URL_DELETED')),
  status TEXT NOT NULL CHECK (status IN ('submitted', 'failed', 'skipped')),
  response TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_indexing_log_created_at ON public.indexing_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_indexing_log_url ON public.indexing_log(url);

ALTER TABLE public.indexing_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_indexing_log"
  ON public.indexing_log FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "authenticated_read_indexing_log"
  ON public.indexing_log FOR SELECT
  TO authenticated
  USING (true);
