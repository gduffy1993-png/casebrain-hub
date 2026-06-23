-- Supabase security advisor: rls_disabled_in_public on criminal_law_chunks.
-- Reference corpus (CPIA/PACE chunks) — server ingests via service role only; no direct client reads.

ALTER TABLE public.criminal_law_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deny_anon_criminal_law_chunks ON public.criminal_law_chunks;
CREATE POLICY deny_anon_criminal_law_chunks
  ON public.criminal_law_chunks
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS deny_authenticated_criminal_law_chunks ON public.criminal_law_chunks;
CREATE POLICY deny_authenticated_criminal_law_chunks
  ON public.criminal_law_chunks
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- RPC: only service_role (getSupabaseAdminClient) — block PostgREST anon/authenticated callers.
REVOKE ALL ON FUNCTION public.match_criminal_law_chunks(vector, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.match_criminal_law_chunks(vector, int) TO service_role;
