# Multimodal RAG Engine - Development Guide

## Project Overview

A multimodal RAG (Retrieval-Augmented Generation) system for analyzing scientific papers and patents. Users can upload PDFs, chat with the content, and interact with extracted diagrams.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: Supabase (PostgreSQL + pgvector)
- **Auth**: Supabase Auth
- **AI**: Google Gemini API
- **Vision**: Transformers.js (DETR model)
- **Styling**: CSS with design system variables
- **Validation**: Zod

## Architecture

```
src/
├── app/
│   ├── api/              # API routes
│   │   ├── auth/         # Authentication endpoints
│   │   ├── chat/         # RAG chat endpoint
│   │   ├── diagrams/     # Diagram interaction
│   │   └── analytics/    # Dashboard data
│   ├── auth/             # Auth pages (login/register)
│   ├── chat/             # Main chat interface
│   ├── upload/           # Document upload
│   ├── diagrams/         # Diagram interaction UI
│   └── dashboard/        # Analytics dashboard
├── components/           # React components
├── lib/                  # Core utilities
│   ├── supabase.ts       # Supabase clients
│   ├── gemini.ts         # Gemini API wrapper
│   ├── chunker.ts        # Text chunking
│   ├── rag.ts            # RAG utilities + caching
│   └── validations.ts    # Zod schemas
├── types/                # TypeScript definitions
└── middleware.ts         # Auth middleware
```

## Key Features

### 1. User Authentication
- Email/password registration and login
- Session-based auth with Supabase
- Protected routes via middleware

### 2. Document Processing
- PDF upload with text extraction
- Text chunking with 1000-word blocks, 200-word overlap
- Gemini embedding generation with caching
- User-scoped document storage

### 3. RAG Chat
- Semantic search via vector similarity
- Streaming responses from Gemini
- Document-scoped queries
- Context-aware answers with math/diagram support

### 4. Diagram Interaction
- DETR-based object detection
- Diagram extraction and storage
- Single diagram Q&A
- Multi-diagram comparison mode

## Database Schema

### Tables
- `documents` - User documents with metadata
- `document_chunks` - Chunked text with embeddings
- `diagrams` - Extracted diagram images
- `query_logs` - Query analytics
- `embedding_cache` - Cached embeddings

### Security
- Row Level Security (RLS) enabled
- User can only access their own data
- Service role for server-side operations

## API Routes

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Sign in
- `POST /api/auth/logout` - Sign out
- `GET /api/auth/callback` - OAuth callback

### Core
- `POST /api/chat` - RAG chat (streaming)
- `POST /api/upload-document` - Upload PDF
- `GET /api/analytics` - Dashboard data

### Diagrams
- `GET /api/diagrams/list` - List user diagrams
- `POST /api/diagrams/chat` - Ask about diagrams

## Development Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run lint     # Run ESLint
npm run typecheck # TypeScript checking
```

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
```

## Deployment

1. Push to GitHub
2. Connect to Vercel
3. Set environment variables
4. Run database migration (supabase-migration-v2.sql)
5. Deploy

## Performance Optimizations

1. **Embedding Caching** - Redis-like cache in Supabase
2. **Batch Embeddings** - Parallel processing with rate limiting
3. **Edge Runtime** - Fast cold starts for API routes
4. **Database Indexes** - HNSW index for vector search
5. **Connection Pooling** - Efficient database connections

## Security Considerations

1. Never expose service role key client-side
2. All data is user-scoped via RLS
3. Input validation with Zod
4. Rate limiting on API routes (future)
5. Secure session handling via HTTP-only cookies
