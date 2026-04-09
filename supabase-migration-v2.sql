-- =============================================
-- Multimodal RAG Engine v2.0 — Supabase Migration
-- Run this in your Supabase SQL Editor
-- =============================================

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- 2. Add user_id column to existing tables (for existing data, set a default user)
ALTER TABLE documents ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT '00000000-0000-0000-0000-000000000000';
ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT '00000000-0000-0000-0000-000000000000';
ALTER TABLE query_logs ADD COLUMN IF NOT EXISTS user_id UUID DEFAULT '00000000-0000-0000-0000-000000000000';

-- 3. Create diagrams table for storing extracted diagrams
CREATE TABLE IF NOT EXISTS diagrams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  chunk_index INTEGER,
  image_url TEXT NOT NULL,
  label TEXT,
  confidence FLOAT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create embeddings cache table
CREATE TABLE IF NOT EXISTS embedding_cache (
  content_hash TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(768) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Update documents table structure
ALTER TABLE documents ALTER COLUMN user_id DROP DEFAULT;
ALTER TABLE documents ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE documents ALTER COLUMN user_id REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE document_chunks ALTER COLUMN user_id DROP DEFAULT;
ALTER TABLE document_chunks ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE document_chunks ALTER COLUMN user_id REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE query_logs ALTER COLUMN user_id DROP DEFAULT;
ALTER TABLE query_logs ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE query_logs ALTER COLUMN user_id REFERENCES auth.users(id) ON DELETE CASCADE;

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_user_id ON document_chunks(user_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_doc_id ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_diagrams_user_id ON diagrams(user_id);
CREATE INDEX IF NOT EXISTS idx_diagrams_document_id ON diagrams(document_id);
CREATE INDEX IF NOT EXISTS idx_query_logs_user_id ON query_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_query_logs_created ON query_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_embedding_cache_user ON embedding_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_embedding_cache_embedding ON embedding_cache USING hnsw (embedding vector_cosine_ops);

-- 7. HNSW index for fast cosine similarity search
CREATE INDEX IF NOT EXISTS idx_chunks_embedding
ON document_chunks
USING hnsw (embedding vector_cosine_ops);

-- 8. RPC function for similarity search (updated with user_id)
CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding vector(768),
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 5,
  filter_document_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  chunk_index INTEGER,
  text_content TEXT,
  image_url TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.chunk_index,
    dc.text_content,
    dc.image_url,
    (1 - (dc.embedding <=> query_embedding))::FLOAT AS similarity
  FROM document_chunks dc
  WHERE
    dc.user_id = COALESCE(p_user_id, dc.user_id)
    AND (filter_document_id IS NULL OR dc.document_id = filter_document_id)
    AND (1 - (dc.embedding <=> query_embedding)) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 9. RPC function for getting user's diagrams
CREATE OR REPLACE FUNCTION get_user_diagrams(
  p_user_id UUID,
  p_document_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  page_number INTEGER,
  chunk_index INTEGER,
  image_url TEXT,
  label TEXT,
  confidence FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.document_id,
    d.page_number,
    d.chunk_index,
    d.image_url,
    d.label,
    d.confidence
  FROM diagrams d
  WHERE d.user_id = p_user_id
    AND (p_document_id IS NULL OR d.document_id = p_document_id)
  ORDER BY d.page_number, d.chunk_index;
END;
$$;

-- 10. Enable Row Level Security
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagrams ENABLE ROW LEVEL SECURITY;
ALTER TABLE embedding_cache ENABLE ROW LEVEL SECURITY;

-- 11. RLS Policies (users can only see their own data)
DROP POLICY IF EXISTS "Allow all on documents" ON documents;
DROP POLICY IF EXISTS "Allow all on document_chunks" ON document_chunks;
DROP POLICY IF EXISTS "Allow all on query_logs" ON query_logs;

CREATE POLICY "Users can manage own documents" ON documents
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own chunks" ON document_chunks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own queries" ON query_logs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own diagrams" ON diagrams
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can access own cache" ON embedding_cache
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 12. Create updated analytics function
CREATE OR REPLACE FUNCTION get_user_analytics(p_user_id UUID)
RETURNS TABLE (
  total_documents BIGINT,
  total_chunks BIGINT,
  total_queries BIGINT,
  total_diagrams BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM documents WHERE user_id = p_user_id)::BIGINT,
    (SELECT COUNT(*) FROM document_chunks WHERE user_id = p_user_id)::BIGINT,
    (SELECT COUNT(*) FROM query_logs WHERE user_id = p_user_id)::BIGINT,
    (SELECT COUNT(*) FROM diagrams WHERE user_id = p_user_id)::BIGINT;
END;
$$;

-- 13. Migration helper function (run once to migrate existing data to first user)
-- First, create a test user and migrate data (run manually after creating user):
-- INSERT INTO auth.users (id, email) VALUES ('your-user-id-here', 'your-email@example.com');
-- UPDATE documents SET user_id = 'your-user-id-here' WHERE user_id = '00000000-0000-0000-0000-000000000000';
-- UPDATE document_chunks SET user_id = 'your-user-id-here' WHERE user_id = '00000000-0000-0000-0000-000000000000';
-- UPDATE query_logs SET user_id = 'your-user-id-here' WHERE user_id = '00000000-0000-0000-0000-000000000000';
