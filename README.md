# 🧠 Multimodal RAG Engine — Open-Science & Patent Interrogator

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://multimodal-open-science-patent-inte.vercel.app)
[![Supabase](https://img.shields.io/badge/Database-Supabase-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com)
[![Gemini AI](https://img.shields.io/badge/AI-Gemini%201.5%20Flash-4285F4?style=for-the-badge&logo=google)](https://aistudio.google.com)

A full-stack **Multimodal Open-Science & Patent Interrogator** — upload scientific papers and patents, automatically extract diagrams with in-browser AI vision, and interrogate your documents with a multimodal retrieval-augmented generation pipeline.

> **🔗 Live Demo:** [multimodal-open-science-patent-inte.vercel.app](https://multimodal-open-science-patent-inte.vercel.app)

---

## 🏗️ Architecture

```
                    ┌──────────────────────────────────────────────┐
                    │              NEXT.JS APP ROUTER              │
                    │         (Vercel Serverless Functions)         │
                    └─────────────┬────────────────┬───────────────┘
                                  │                │
                    ┌─────────────▼──────┐   ┌─────▼───────────────┐
                    │   DATA INGESTION   │   │   RAG CHAT ENGINE   │
                    │                    │   │                     │
                    │  PDF Upload        │   │  Query → Embedding  │
                    │  ↓                 │   │  ↓                  │
                    │  Text Extraction   │   │  Cosine Similarity  │
                    │  (pdf-parse)       │   │  Search (pgvector)  │
                    │  ↓                 │   │  ↓                  │
                    │  Chunking          │   │  Context Assembly   │
                    │  (500w, 50 overlap)│   │  (text + diagrams)  │
                    │  ↓                 │   │  ↓                  │
                    │  Embedding         │   │  Gemini 1.5 Flash   │
                    │  (Gemini 768-dim)  │   │  (Streaming)        │
                    └────────┬───────────┘   └──────────┬──────────┘
                             │                          │
                    ┌────────▼──────────────────────────▼──────────┐
                    │           SUPABASE (PostgreSQL + pgvector)    │
                    │                                               │
                    │  documents ──→ document_chunks ──→ query_logs │
                    │                  (768-dim vectors)             │
                    │                  (HNSW index)                  │
                    │                                               │
                    │  Storage: document-assets (S3-compatible)     │
                    └───────────────────────────────────────────────┘
                                        │
                    ┌───────────────────▼───────────────────────────┐
                    │         BROWSER AI VISION (Client-Side)       │
                    │                                               │
                    │  PDF Canvas Rendering (pdfjs-dist)            │
                    │  ↓                                            │
                    │  DETR ResNet-50 Object Detection              │
                    │  (Transformers.js — runs 100% in browser)     │
                    │  ↓                                            │
                    │  Auto-crop diagrams → Upload to Supabase      │
                    └───────────────────────────────────────────────┘
```

---

## 🚀 Tech Stack (All Free Tier)

| Layer | Technology | Cost |
|-------|-----------|------|
| **Framework** | Next.js 16 (App Router, TypeScript) | Free |
| **Styling** | Tailwind CSS + Custom Glassmorphism | Free |
| **Database** | Supabase PostgreSQL + pgvector | Free (500MB) |
| **Storage** | Supabase Storage (S3-compatible) | Free (1GB) |
| **PDF Parsing** | pdf-parse (server-side) | Free |
| **Vision ML** | Transformers.js (DETR ResNet-50) | Free (in-browser) |
| **Embeddings** | Gemini text-embedding-004 (768-dim) | Free (1500 RPD) |
| **Chat LLM** | Gemini 1.5 Flash (streaming) | Free (15 RPM) |
| **Charts** | Recharts | Free |
| **Deployment** | Vercel | Free (Hobby) |

---

## 📁 Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── analytics/route.ts       # Dashboard metrics aggregation API
│   │   ├── chat/route.ts            # RAG chat: embed query → search → stream Gemini
│   │   ├── upload-diagram/route.ts  # Cropped diagram upload + chunk linking
│   │   └── upload-document/route.ts # PDF upload → extract → chunk → embed → store
│   ├── chat/page.tsx                # Streaming chat interface with document filter
│   ├── dashboard/page.tsx           # Password-protected analytics dashboard
│   ├── upload/page.tsx              # Drag-drop PDF upload with progress tracking
│   ├── globals.css                  # Full glassmorphism design system
│   ├── layout.tsx                   # Root layout with animated background
│   └── page.tsx                     # Landing page with hero + feature grid
├── components/
│   ├── DiagramDetector.tsx          # In-browser DETR vision + bounding boxes
│   ├── NavBar.tsx                   # Glassmorphism navigation with active routes
│   └── PDFViewer.tsx                # PDF canvas renderer with zoom + pagination
└── lib/
    ├── chunker.ts                   # Text chunking (500 words, 50-word overlap)
    ├── gemini.ts                    # Gemini embeddings + streaming chat utilities
    └── supabase.ts                  # Client + server Supabase clients
```

---

## ⚙️ Features

### 📄 Smart PDF Ingestion
- Drag-and-drop PDF upload to Supabase Storage
- Server-side text extraction with `pdf-parse`
- Intelligent chunking: 500-word blocks with 50-word overlap for context continuity
- 768-dimensional vector embeddings via Gemini `text-embedding-004`
- Batch insertion into PostgreSQL with HNSW-indexed vector column

### 👁️ Browser AI Vision (Zero Server Cost)
- DETR ResNet-50 object detection runs **entirely in the browser** via Transformers.js
- PDF pages rendered onto HTML `<canvas>` elements
- Detected objects highlighted with bounding box overlays
- Diagrams automatically cropped and uploaded to Supabase
- Linked to nearest text chunks for multimodal retrieval

### 💬 Multimodal RAG Chat
- User queries converted to vector embeddings in real-time
- Cosine similarity search via PostgreSQL RPC (`match_document_chunks`)
- Top-5 chunks + associated diagrams assembled as context
- Streaming responses from Gemini 1.5 Flash with markdown formatting
- Document-scoped queries (filter by specific document)

### 📊 Analytics Dashboard
- Password-protected access gate
- KPI cards: total documents, chunks, queries, diagrams
- Time-series chart of query volume (Recharts AreaChart)
- Recent documents table with chunk/diagram counts

### 🎨 Premium UI
- Dark glassmorphism design with animated gradient background
- Inter typography from Google Fonts
- Micro-animations: fade-in, typing indicators, hover effects
- Responsive layout (desktop + mobile)

---

## 📋 Setup Instructions

### 1. Clone & Install

```bash
git clone https://github.com/tusharsharma20021114-rgb/Multimodal-Open-Science-Patent-Interrogator.git
cd Multimodal-Open-Science-Patent-Interrogator
npm install
```

### 2. Supabase Setup (Free Tier)

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the entire contents of `supabase-migration.sql`
3. Go to **Storage** → Create a new bucket named `document-assets` (set to **Public**)
4. Go to **Settings** → **API** → Copy your project URL, anon key, and service role key

### 3. Gemini API Key (Free Tier)

1. Go to [aistudio.google.com](https://aistudio.google.com)
2. Create a free API key
3. Free tier: 15 RPM, 1,500 requests/day, 1M tokens/day

### 4. Environment Variables

```bash
cp .env.example .env.local
```

Fill in your keys:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
GEMINI_API_KEY=AI...
DASHBOARD_PASSWORD=your-password
```

### 5. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 6. Deploy to Vercel

1. Push to GitHub
2. Import the repository at [vercel.com/new](https://vercel.com/new)
3. Add environment variables in Vercel project settings
4. Click Deploy — done!

---

## 🗄️ Database Schema

```sql
-- Documents table
documents (id UUID, title TEXT, metadata JSONB, file_url TEXT, 
           total_chunks INT, diagrams_extracted INT, upload_date TIMESTAMPTZ)

-- Document chunks with vector embeddings
document_chunks (id UUID, document_id UUID FK, chunk_index INT, 
                 text_content TEXT, embedding vector(768), image_url TEXT)

-- Query logs for analytics
query_logs (id UUID, query TEXT, response_preview TEXT, 
            chunks_retrieved INT, document_id UUID FK, created_at TIMESTAMPTZ)

-- HNSW index for fast cosine similarity search
CREATE INDEX idx_chunks_embedding ON document_chunks 
  USING hnsw (embedding vector_cosine_ops);

-- RPC function for semantic search
match_document_chunks(query_embedding, match_threshold, match_count, filter_document_id)
```

---

## 🔒 Security Notes

- Row Level Security (RLS) enabled on all tables
- Service role key used only in server-side API routes (never exposed to client)
- Dashboard protected by password gate
- `.env.local` excluded from git via `.gitignore`

---

## 🔬 Build Walkthrough

This section documents the complete development process and what each component does.

### What Was Built

A complete **Multimodal Open-Science & Patent Interrogator** — a full-stack Next.js application with **5 integrated systems**:

| System | Description |
|--------|-------------|
| **📄 PDF Ingestion Pipeline** | Upload → Text Extraction (`pdf-parse`) → Chunking (500w, 50 overlap) → Embedding (`Gemini text-embedding-004`) → Store in Supabase pgvector |
| **👁️ Browser AI Vision** | PDF Canvas Rendering → DETR ResNet-50 Object Detection (`Transformers.js`) → Auto-crop Diagrams → Upload to Supabase Storage |
| **💬 RAG Chat Engine** | User Query → Query Embedding → Cosine Similarity Search (RPC) → Context + Images Assembly → Gemini 1.5 Flash Streaming Response |
| **📊 Analytics Dashboard** | Password Gate → KPI Cards (docs, chunks, queries, diagrams) → Time-series Charts (Recharts) → Recent Documents Table |
| **🎨 Premium UI** | Dark Glassmorphism Design System → Animated Gradients → Micro-animations → Responsive Layout |

### Data Flow

```
User uploads PDF
       │
       ▼
┌──────────────────┐
│  pdf-parse        │──→ Raw text extracted
│  (server-side)    │
└──────────────────┘
       │
       ▼
┌──────────────────┐
│  Chunker          │──→ 500-word blocks with 50-word overlap
│  (lib/chunker.ts) │
└──────────────────┘
       │
       ▼
┌──────────────────┐
│  Gemini Embeddings│──→ 768-dimensional vectors per chunk
│  (text-embedding  │
│   -004)           │
└──────────────────┘
       │
       ▼
┌──────────────────┐
│  Supabase         │──→ document_chunks table (HNSW indexed)
│  (pgvector)       │    document-assets bucket (PDF + diagrams)
└──────────────────┘
       │
       ▼
User asks a question
       │
       ▼
┌──────────────────┐
│  Query Embedding  │──→ Same 768-dim vector space
└──────────────────┘
       │
       ▼
┌──────────────────┐
│  match_document_  │──→ Top-5 most similar chunks + diagrams
│  chunks() RPC     │    (cosine similarity > 0.5 threshold)
└──────────────────┘
       │
       ▼
┌──────────────────┐
│  Gemini 1.5 Flash │──→ Streaming markdown response
│  (with context)   │    grounded in retrieved documents
└──────────────────┘
```

### Files Created — Complete Inventory

| File | Purpose | Key Implementation Detail |
|------|---------|--------------------------|
| `next.config.ts` | Turbopack config, server externals, Supabase image domains | `serverExternalPackages: ["pdf-parse"]` for Node.js compatibility |
| `supabase-migration.sql` | Full DB schema with 3 tables, pgvector, RPC function, HNSW index, RLS | `vector(768)` columns with `vector_cosine_ops` operator class |
| `src/lib/supabase.ts` | Client-side + server-side Supabase clients | Dual client pattern: anon key for browser, service role for API routes |
| `src/lib/gemini.ts` | Gemini embeddings (768-dim) + streaming chat | Batched embedding calls + `generateContentStream()` for real-time responses |
| `src/lib/chunker.ts` | Text chunking engine | 500-word blocks with 50-word sliding overlap for context continuity |
| `src/app/api/upload-document/route.ts` | PDF upload → extract → chunk → embed → store | Batch insertion of 20 chunks at a time to avoid Supabase limits |
| `src/app/api/upload-diagram/route.ts` | Cropped diagram upload + chunk linking | Links diagram images to nearest document chunks via `image_url` column |
| `src/app/api/chat/route.ts` | RAG query → similarity search → streaming Gemini | `match_document_chunks` RPC with configurable threshold + document filter |
| `src/app/api/analytics/route.ts` | Dashboard metrics aggregation | Aggregates across 3 tables + generates time-series data for charts |
| `src/app/page.tsx` | Landing page with hero + feature grid | Animated gradient text + glassmorphism feature cards |
| `src/app/upload/page.tsx` | Drag-drop upload with progress + document list | Real-time upload progress bar + automatic document list refresh |
| `src/app/chat/page.tsx` | Streaming chat with markdown, document filter | `ReadableStream` consumption for character-by-character streaming display |
| `src/app/dashboard/page.tsx` | Password gate → KPI cards + Recharts charts | Client-side password check → conditional rendering of full analytics |
| `src/components/NavBar.tsx` | Glassmorphism navigation with active route | `usePathname()` hook for active state detection |
| `src/components/PDFViewer.tsx` | PDF canvas renderer with page nav + zoom | `pdfjs-dist` web worker for off-thread PDF rendering |
| `src/components/DiagramDetector.tsx` | In-browser DETR detection + bounding boxes | `@xenova/transformers` pipeline runs entirely client-side (zero server cost) |
| `src/app/globals.css` | Full design system: glassmorphism, animations | CSS custom properties + `backdrop-filter` + `@keyframes` animations |

### Verification Results

```
✅ npx tsc --noEmit          → Zero TypeScript errors
✅ npm run build             → All routes compiled successfully
✅ Dev server (npm run dev)  → All 4 pages render correctly
✅ API test (curl /api/analytics) → Supabase connection verified
✅ Vercel deployment         → Production build succeeded
✅ Live site                 → All pages accessible at production URL
```

### Deployment Checklist

```
✅ GitHub repository created and code pushed
✅ Supabase project provisioned (free tier)
✅ pgvector extension enabled
✅ Database tables created (documents, document_chunks, query_logs)
✅ HNSW index created for vector similarity search
✅ RPC function (match_document_chunks) deployed
✅ Row Level Security policies configured
✅ Storage bucket (document-assets) created as public
✅ Gemini API key configured (free tier)
✅ Environment variables set in Vercel
✅ Production deployment live on Vercel
```

---

## 📄 License

MIT

---

Built with ❤️ using Next.js, Supabase, Gemini AI, and Transformers.js
