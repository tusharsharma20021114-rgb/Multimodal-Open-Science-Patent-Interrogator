# Multimodal RAG Engine — Open-Science & Patent Interrogator

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://multimodal-open-science-patent-inte.vercel.app)
[![Supabase](https://img.shields.io/badge/Database-Supabase-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com)
[![Gemini AI](https://img.shields.io/badge/AI-Gemini%202.0%20Flash-4285F4?style=for-the-badge&logo=google)](https://aistudio.google.com)

A full-stack **Multimodal Open-Science & Patent Interrogator** — upload scientific papers and patents, automatically extract diagrams with in-browser AI vision, chat with your documents using RAG, and interact with individual diagrams.

> **Live Demo:** [multimodal-open-science-patent-inte.vercel.app](https://multimodal-open-science-patent-inte.vercel.app)

---

## New in v2.0

- **User Authentication** — Register, login, and manage your own documents
- **Diagram Interaction** — Ask questions about individual diagrams or compare multiple diagrams together
- **Performance Optimizations** — Embedding caching, batch processing, edge runtime
- **Multi-user Support** — Each user has their own private document space

---

## Architecture

```
                    ┌──────────────────────────────────────────────┐
                    │              NEXT.JS APP ROUTER              │
                    │         (Vercel Serverless Functions)        │
                    └─────────────┬────────────────┬───────────────┘
                                  │                │
                    ┌─────────────▼──────┐   ┌─────▼───────────────┐
                    │   DATA INGESTION   │   │   RAG CHAT ENGINE  │
                    │                    │   │                     │
                    │  PDF Upload        │   │  Query → Embedding  │
                    │  ↓                 │   │  ↓                  │
                    │  Text Extraction   │   │  Cosine Similarity  │
                    │  (pdf-parse)      │   │  Search (pgvector)  │
                    │  ↓                 │   │  ↓                  │
                    │  Chunking          │   │  Context Assembly   │
                    │  (1000w, 200)     │   │  (text + diagrams)  │
                    │  ↓                 │   │  ↓                  │
                    │  Embedding         │   │  Gemini 2.0 Flash   │
                    │  (Gemini 768-dim) │   │  (Streaming)        │
                    └────────┬───────────┘   └──────────┬──────────┘
                             │                          │
                    ┌────────▼──────────────────────────▼──────────┐
                    │           SUPABASE (PostgreSQL + pgvector)   │
                    │                                              │
                    │  documents ──→ document_chunks ──→ query_logs│
                    │  diagrams ──────────────────────────────────│
                    │  embedding_cache (performance)               │
                    │                                              │
                    │  RLS: Users can only access their own data │
                    └────────────────────────────────────────────┘
```

---

## Tech Stack (All Free Tier)

| Layer | Technology | Cost |
|-------|-----------|------|
| **Framework** | Next.js 16 (App Router, TypeScript) | Free |
| **Authentication** | Supabase Auth | Free |
| **Database** | Supabase PostgreSQL + pgvector | Free (500MB) |
| **Storage** | Supabase Storage (S3-compatible) | Free (1GB) |
| **PDF Parsing** | pdf-parse (server-side) | Free |
| **Vision ML** | Transformers.js (DETR ResNet-50) | Free (in-browser) |
| **Embeddings** | Gemini text-embedding-001 (768-dim) | Free |
| **Chat LLM** | Gemini 2.0 Flash (streaming) | Free |
| **Charts** | Recharts | Free |
| **Validation** | Zod | Free |
| **Deployment** | Vercel | Free (Hobby) |

---

## Features

### User Authentication
- Email/password registration and login
- Protected routes with middleware
- User-scoped data isolation via RLS

### Smart PDF Ingestion
- Drag-and-drop PDF upload
- Server-side text extraction
- Intelligent chunking: 1000-word blocks with 200-word overlap
- 768-dimensional embeddings via Gemini
- Embedding caching for performance

### Multimodal RAG Chat
- Real-time vector similarity search
- Streaming responses with markdown
- Document-scoped queries
- Context-aware answers with math/diagram support

### Diagram Interaction (New!)
- **Single Diagram Mode** — Ask questions about individual extracted diagrams
- **Compare Mode** — Analyze multiple diagrams together
- Automatic diagram extraction with DETR
- Context-aware explanations

### Analytics Dashboard
- KPI cards: documents, chunks, queries, diagrams
- Query volume time-series chart
- Recent documents list

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── auth/              # Login, register, logout, callback
│   │   ├── chat/              # RAG chat endpoint
│   │   ├── diagrams/           # Diagram list and chat
│   │   └── analytics/          # Dashboard metrics
│   ├── auth/                  # Login/register pages
│   ├── chat/                  # Main chat interface
│   ├── upload/                # PDF upload page
│   ├── diagrams/              # Diagram interaction page
│   └── dashboard/             # Analytics dashboard
├── components/                # React components
├── lib/
│   ├── supabase.ts           # Supabase clients
│   ├── supabase-client.ts    # Browser client
│   ├── supabase-server.ts     # Server client
│   ├── gemini.ts             # Gemini API wrapper
│   ├── rag.ts                # RAG utilities + caching
│   ├── chunker.ts            # Text chunking
│   └── validations.ts        # Zod schemas
├── types/                    # TypeScript definitions
└── middleware.ts             # Auth middleware
```

---

## Setup Instructions

### 1. Clone & Install

```bash
git clone https://github.com/tusharsharma20021114-rgb/Multimodal-Open-Science-Patent-Interrogator.git
cd Multimodal-Open-Science-Patent-Interrogator
git checkout feat/light-ui-production
npm install
```

### 2. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run `supabase-migration-v2.sql`
3. Create a storage bucket named `document-assets` (Public)
4. Copy your API keys from **Settings** → **API**

### 3. Gemini API Key

1. Get a free key at [aistudio.google.com](https://aistudio.google.com)

### 4. Environment Variables

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
GEMINI_API_KEY=AI...
```

### 5. Run Locally

```bash
npm run dev
```

---

## Deployment

### Database Migration

Before deploying, run the new migration in Supabase SQL Editor:

1. Copy contents of `supabase-migration-v2.sql`
2. Paste and execute in Supabase SQL Editor
3. This adds user authentication and diagram tables

### Vercel Deployment

1. Push to GitHub
2. Connect repository to Vercel
3. Add environment variables
4. Deploy

---

## Database Schema

### New in v2.0

```sql
-- User-scoped documents
documents (id, user_id, title, metadata, file_url, total_chunks, diagrams_extracted)

-- Vector embeddings
document_chunks (id, user_id, document_id, chunk_index, text_content, embedding, image_url)

-- Extracted diagrams (new)
diagrams (id, user_id, document_id, page_number, chunk_index, image_url, label, confidence)

-- Embedding cache (new)
embedding_cache (content_hash, user_id, content, embedding)

-- Query logs
query_logs (id, user_id, query, response_preview, chunks_retrieved, document_id)
```

### RLS Policies

Users can only access their own data:
```sql
CREATE POLICY "Users can manage own documents" ON documents
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

---

## API Reference

### Authentication
- `POST /api/auth/register` — Create account
- `POST /api/auth/login` — Sign in
- `POST /api/auth/logout` — Sign out
- `GET /api/auth/callback` — OAuth callback

### Core
- `POST /api/chat` — RAG chat (streaming)
- `POST /api/upload-document` — Upload PDF
- `GET /api/analytics` — Dashboard data

### Diagrams
- `GET /api/diagrams/list` — List user diagrams
- `POST /api/diagrams/chat` — Ask about diagrams

---

## Performance Features

| Feature | Description |
|---------|-------------|
| **Edge Runtime** | Fast cold starts for API routes |
| **Embedding Cache** | Avoid regenerating same embeddings |
| **Batch Processing** | Process embeddings in parallel batches |
| **HNSW Index** | Fast vector similarity search |
| **Connection Pooling** | Efficient database connections |

---

## License

MIT

---

Built with Next.js, Supabase, Gemini AI, and Transformers.js
