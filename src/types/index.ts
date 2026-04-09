export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface Document {
  id: string;
  user_id: string;
  title: string;
  metadata: DocumentMetadata;
  file_url: string;
  total_chunks: number;
  diagrams_extracted: number;
  upload_date: string;
}

export type Doc = Pick<Document, "id" | "title">;

export type DocumentListItem = Pick<Document, "id" | "title" | "total_chunks" | "diagrams_extracted" | "upload_date">;

export interface DocumentMetadata {
  pages?: number;
  size?: number;
  originalName?: string;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  chunk_index: number;
  text_content: string;
  embedding: number[];
  image_url: string | null;
  created_at: string;
}

export interface Diagram {
  id: string;
  document_id: string;
  user_id: string;
  page_number: number;
  chunk_index: number;
  image_url: string;
  label: string | null;
  confidence: number | null;
  created_at: string;
}

export type DiagramListItem = Pick<Diagram, "id" | "document_id" | "page_number" | "image_url" | "label">;

export interface QueryLog {
  id: string;
  user_id: string;
  query: string;
  response_preview: string | null;
  chunks_retrieved: number;
  document_id: string | null;
  created_at: string;
}

export interface ContextChunk {
  text: string;
  imageUrl?: string;
  similarity?: number;
  chunkIndex?: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  images?: string[];
  diagramId?: string;
}

export interface Analytics {
  totals: {
    documents: number;
    chunks: number;
    queries: number;
    diagrams: number;
  };
  queryTimeSeries: { date: string; queries: number }[];
  recentDocuments: Document[];
}

export interface Detection {
  label: string;
  score: number;
  box: { xmin: number; ymin: number; xmax: number; ymax: number };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface UploadResponse {
  success: boolean;
  documentId: string;
  title: string;
  chunks: number;
  pages: number;
}
