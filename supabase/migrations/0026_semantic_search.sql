-- Semantic Search Tables
-- Stores embeddings for cases, documents, and letters

-- Enable pgvector extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS vector;

-- Case embeddings table
CREATE TABLE IF NOT EXISTS case_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL,
  content_hash TEXT NOT NULL, -- Hash of content to detect changes
  content_summary TEXT NOT NULL, -- The summarized text that was embedded
  embedding vector(1536), -- OpenAI ada-002 dimension
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(case_id)
);

-- Document embeddings table
CREATE TABLE IF NOT EXISTS document_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL,
  chunk_index INTEGER DEFAULT 0, -- For documents split into chunks
  content_hash TEXT NOT NULL,
  content_text TEXT NOT NULL, -- The chunk text
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(document_id, chunk_index)
);

-- Letter embeddings table  
CREATE TABLE IF NOT EXISTS letter_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  letter_id UUID NOT NULL REFERENCES letters(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
  org_id TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  content_summary TEXT NOT NULL,
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(letter_id)
);

-- Indexes for fast similarity search
CREATE INDEX IF NOT EXISTS idx_case_embeddings_org ON case_embeddings(org_id);
CREATE INDEX IF NOT EXISTS idx_document_embeddings_org ON document_embeddings(org_id);
CREATE INDEX IF NOT EXISTS idx_document_embeddings_case ON document_embeddings(case_id);
CREATE INDEX IF NOT EXISTS idx_letter_embeddings_org ON letter_embeddings(org_id);

-- IVFFlat index for similarity search (requires data to be present first)
-- Run these after initial data load:
-- CREATE INDEX IF NOT EXISTS idx_case_embeddings_vector ON case_embeddings USING ivfflat (embedding vector_cosine_ops);
-- CREATE INDEX IF NOT EXISTS idx_document_embeddings_vector ON document_embeddings USING ivfflat (embedding vector_cosine_ops);
-- CREATE INDEX IF NOT EXISTS idx_letter_embeddings_vector ON letter_embeddings USING ivfflat (embedding vector_cosine_ops);

-- RLS
ALTER TABLE case_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE letter_embeddings ENABLE ROW LEVEL SECURITY;

