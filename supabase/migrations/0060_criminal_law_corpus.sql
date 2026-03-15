-- Criminal law corpus for RAG (Phase 2). Shared across orgs.
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS criminal_law_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  title TEXT NOT NULL,
  content_text TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_criminal_law_chunks_source ON criminal_law_chunks(source);

COMMENT ON TABLE criminal_law_chunks IS 'Chunked criminal law (CPIA, PACE, etc.) for retrieval; embeddings via OpenAI ada-002';

-- RPC for vector similarity search (cosine distance)
CREATE OR REPLACE FUNCTION match_criminal_law_chunks(
  query_embedding vector(1536),
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  source text,
  title text,
  content_text text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.source,
    c.title,
    c.content_text,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM criminal_law_chunks c
  WHERE c.embedding IS NOT NULL
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
