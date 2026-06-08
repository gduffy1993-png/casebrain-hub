-- Create llm_cache table for smart caching of LLM analysis results
CREATE TABLE IF NOT EXISTS public.llm_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id TEXT NOT NULL,
  case_id UUID NOT NULL,
  cache_key TEXT NOT NULL UNIQUE,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_llm_cache_org_case ON public.llm_cache(org_id, case_id);
CREATE INDEX IF NOT EXISTS idx_llm_cache_key ON public.llm_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_llm_cache_updated ON public.llm_cache(updated_at);

-- RLS policies (adjust based on your RLS setup)
-- ALTER TABLE public.llm_cache ENABLE ROW LEVEL SECURITY;

-- Optional: Add cleanup policy for old cache entries (older than 30 days)
-- CREATE OR REPLACE FUNCTION cleanup_old_llm_cache()
-- RETURNS void AS $$
-- BEGIN
--   DELETE FROM public.llm_cache
--   WHERE updated_at < NOW() - INTERVAL '30 days';
-- END;
-- $$ LANGUAGE plpgsql;

