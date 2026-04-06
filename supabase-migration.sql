-- =============================================
-- Multimodal RAG Engine — Supabase Migration
-- Run this in your Supabase SQL Editor
-- =============================================

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- 2. Documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  file_url TEXT,
  total_chunks INTEGER DEFAULT 0,
  diagrams_extracted INTEGER DEFAULT 0,
  upload_date TIMESTAMPTZ DEFAULT now()
);

-- 3. Document chunks with vector embeddings (768-dim for Gemini)
CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  text_content TEXT NOT NULL,
  embedding vector(768),
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Query logs for analytics
CREATE TABLE IF NOT EXISTS query_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  response_preview TEXT,
  chunks_retrieved INTEGER DEFAULT 0,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. HNSW index for fast cosine similarity search
CREATE INDEX IF NOT EXISTS idx_chunks_embedding
ON document_chunks
USING hnsw (embedding vector_cosine_ops);

-- 6. RPC function for similarity search
CREATE OR REPLACE FUNCTION match_document_chunks(
  query_embedding vector(768),
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 5,
  filter_document_id UUID DEFAULT NULL
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
    (filter_document_id IS NULL OR dc.document_id = filter_document_id)
    AND (1 - (dc.embedding <=> query_embedding)) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 7. Enable Row Level Security (allow all for anon in free tier)
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on documents" ON documents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on document_chunks" ON document_chunks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on query_logs" ON query_logs FOR ALL USING (true) WITH CHECK (true);
