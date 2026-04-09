# Multimodal RAG Engine - Complete Project Documentation

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Working State (Before)](#2-working-state-before)
3. [Changes Made](#3-changes-made)
4. [File Reference](#4-file-reference)
5. [Database Schema](#5-database-schema)
6. [Production Upgrade Goals](#6-production-readiness-goals)
7. [Implementation Roadmap](#7-implementation-roadmap)
8. [Step-by-Step Execution](#8-step-by-step-execution)
9. [Files Summary](#9-files-summary)
10. [Flow Diagrams](#10-flow-diagrams)
11. [Current Issues](#11-current-issues)

---

## 1. PROJECT OVERVIEW

### What This Project Is
**Multimodal RAG Engine** is a full-stack web application for analyzing scientific papers and patents.

### Features
- Upload PDF documents
- Chat with document content using AI (RAG)
- Extract and interact with diagrams from documents

### Tech Stack
| Layer | Technology | Cost |
|-------|-----------|------|
| Frontend | Next.js 16 | Free |
| Database | Supabase (PostgreSQL + pgvector) | Free tier |
| Auth | Supabase Auth | Free |
| AI/ML | Google Gemini API | Free tier |
| Vision | Transformers.js | Free |
| Deployment | Vercel | Free tier |

### Live URLs
- **Deployed:** https://multimodal-open-science-patent-inte.vercel.app
- **GitHub:** https://github.com/tusharsharma20021114-rgb/Multimodal-Open-Science-Patent-Interrogator
- **Current Branch:** `feat/light-ui-production`

---

## 2. WORKING STATE (Before Changes)

### What Was Working ✅
| Feature | Status |
|---------|--------|
| PDF Upload | Working |
| Text Extraction | Working |
| Chunking (1000-word, 200 overlap) | Working |
| Embeddings (Gemini 768-dim) | Working |
| Vector Search (HNSW) | Working |
| Chat (Streaming) | Working |
| Analytics Dashboard | Working |

### Original Architecture
```
User Upload PDF → pdf-parse → chunkText → Gemini Embeddings → Supabase pgvector
User Query → Embed Query → Cosine Search → Gemini Flash Response
```

### Original Database Schema
```sql
documents (id, title, metadata, file_url, total_chunks, diagrams_extracted, upload_date)
document_chunks (id, document_id, chunk_index, text_content, embedding, image_url)
query_logs (id, query, response_preview, chunks_retrieved, document_id, created_at)
```

### Security Issues
1. **Dashboard Password Bypass:**
   ```typescript
   // ANY non-empty password worked!
   if (password === "admin123" || password.length > 0) {
     setAuthenticated(true);
   }
   ```
2. **No User Authentication** - Anyone could access documents
3. **Hardcoded API Keys** in `ingest_full.mjs`, `test_e2e.mjs`
4. **Permissive RLS Policies:**
   ```sql
   CREATE POLICY "Allow all on documents" ON documents FOR ALL USING (true) WITH CHECK (true);
   ```

---

## 3. CHANGES MADE

### Branch: `feat/light-ui-production`

### New Features
| Feature | Priority | Status |
|---------|----------|--------|
| User Authentication | High | ✅ Code Written |
| Multi-user Support | High | ✅ Code Written |
| Diagram Interaction | High | ✅ Code Written |
| Embedding Cache | Medium | ✅ Code Written |
| Zod Validation | Medium | ✅ Code Written |

### New Pages
- `/auth/login` - Login page
- `/auth/register` - Registration page
- `/diagrams` - Diagram interaction UI

### New API Endpoints
- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/logout`
- `GET /api/auth/callback`
- `POST /api/diagrams/chat`
- `GET /api/diagrams/list`

---

## 4. FILE REFERENCE

### Files Created/Modified

| File | Type | Purpose |
|------|------|---------|
| `src/middleware.ts` | NEW | Auth route protection |
| `src/types/index.ts` | NEW | TypeScript types |
| `src/lib/supabase.ts` | MODIFIED | Supabase exports |
| `src/lib/supabase-client.ts` | NEW | Browser client |
| `src/lib/supabase-server.ts` | NEW | Server client |
| `src/lib/rag.ts` | NEW | RAG + caching |
| `src/lib/validations.ts` | NEW | Zod schemas |
| `src/lib/utils/index.ts` | NEW | Utilities |
| `src/app/auth/login/page.tsx` | NEW | Login UI |
| `src/app/auth/register/page.tsx` | NEW | Register UI |
| `src/app/diagrams/page.tsx` | NEW | Diagram UI |
| `src/app/api/auth/*/route.ts` | NEW | Auth APIs |
| `src/app/api/diagrams/*/route.ts` | NEW | Diagram APIs |
| `supabase-migration-v2.sql` | NEW | DB migration |

### File Details

#### `src/middleware.ts` ⚠️ HAS BUG
Route protection logic has a bug - see Section 11.

#### `src/lib/rag.ts`
Key functions:
- `generateEmbeddingCached()` - Cache hits
- `generateEmbeddingsBatched()` - Batch processing
- `searchDocuments()` - Vector search
- `explainDiagram()` - Single diagram Q&A
- `explainMultipleDiagrams()` - Multi-diagram comparison

#### `src/app/diagrams/page.tsx`
Features:
- Browse extracted diagrams
- Filter by document
- Single Mode: Click to ask questions
- Compare Mode: Select multiple diagrams
- Full-screen preview modal

---

## 5. DATABASE SCHEMA

### Current State (OLD)
```sql
documents (id, title, metadata, file_url, total_chunks, diagrams_extracted, upload_date)
-- NO user_id
```

### Target State (NEW - After Migration)
```sql
-- documents WITH user_id
documents (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),  -- NEW
  title TEXT,
  metadata JSONB,
  file_url TEXT,
  total_chunks INT,
  diagrams_extracted INT,
  upload_date TIMESTAMPTZ
)

-- document_chunks WITH user_id
document_chunks (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),  -- NEW
  document_id UUID REFERENCES documents(id),
  chunk_index INT,
  text_content TEXT,
  embedding vector(768),
  image_url TEXT
)

-- query_logs WITH user_id
query_logs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),  -- NEW
  query TEXT,
  response_preview TEXT,
  chunks_retrieved INT,
  document_id UUID,
  created_at TIMESTAMPTZ
)

-- NEW tables
diagrams (
  id UUID PRIMARY KEY,
  user_id UUID,
  document_id UUID,
  page_number INT,
  chunk_index INT,
  image_url TEXT,
  label TEXT,
  confidence FLOAT,
  created_at TIMESTAMPTZ
)

embedding_cache (
  content_hash TEXT PRIMARY KEY,
  user_id UUID,
  content TEXT,
  embedding vector(768),
  created_at TIMESTAMPTZ
)
```

---

## 6. PRODUCTION READINESS GOALS

### Current vs Target

| Goal | Current | Target |
|------|---------|--------|
| User Authentication | ❌ None | ✅ Login/Register |
| Data Isolation | ❌ Public | ✅ User-scoped |
| Secure Password | ❌ Bypassable | ✅ Supabase Auth |
| API Validation | ❌ None | ✅ Zod schemas |
| Embedding Cache | ❌ None | ✅ Cache hits |
| Diagram Interaction | ❌ Basic | ✅ Q&A + Compare |

---

## 7. IMPLEMENTATION ROADMAP

### Phase 1: Database Migration ⏳
**Status:** SQL written, needs execution

**Action:** Run `supabase-migration-v2.sql` in Supabase SQL Editor

### Phase 2: Fix Middleware ⚠️
**Status:** Code has bug, needs fix

**Bug Location:** `src/middleware.ts` line 36-43

**Current Code (Buggy):**
```typescript
const isAuthPage = request.nextUrl.pathname.startsWith("/auth");
const isPublicPage = ["/", "/chat", "/upload", "/diagrams"].includes(...);

if (!user && !isAuthPage && !isStaticFile) {
  // BUG: isPublicPage is NOT checked!
  // Routes /chat, /upload, /diagrams are NOT protected
}
```

**Fix Required:**
```typescript
const publicPaths = ["/", "/auth/login", "/auth/register", "/api/auth/callback"];
const isPublicPath = publicPaths.some(p => request.nextUrl.pathname === p);

if (!user && !isPublicPath) {
  url.pathname = "/auth/login";
  return NextResponse.redirect(url);
}
```

### Phase 3: Deploy
**Status:** Ready to push

---

## 8. STEP-BY-STEP EXECUTION

### Step 1: Run Database Migration (YOU DO THIS)
```
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to SQL Editor
4. Copy contents of supabase-migration-v2.sql
5. Paste and Execute
```

### Step 2: Fix Middleware
```typescript
// src/middleware.ts - Replace redirect logic

const publicPaths = [
  "/",
  "/auth/login",
  "/auth/register",
  "/api/auth/callback"
];

const isPublicPath = publicPaths.some(p => 
  request.nextUrl.pathname === p
);

if (!user && !isPublicPath) {
  const url = request.nextUrl.clone();
  url.pathname = "/auth/login";
  return NextResponse.redirect(url);
}

if (user && request.nextUrl.pathname.startsWith("/auth/")) {
  const url = request.nextUrl.clone();
  url.pathname = "/chat";
  return NextResponse.redirect(url);
}
```

### Step 3: Commit and Push
```bash
git add .
git commit -m "fix: middleware route protection"
git push origin feat/light-ui-production
```

### Step 4: Vercel Deploys (Automatic)
```
Push detected → Build → Deploy
```

### Step 5: Verify
```
1. Visit deployed URL
2. Should redirect to /auth/login
3. Register new account
4. Upload PDF
5. Chat with document
6. Visit /diagrams page
```

---

## 9. FILES SUMMARY

| # | File | Lines | Purpose |
|---|------|-------|---------|
| 1 | `src/middleware.ts` | 52 | Route protection (BUGGY) |
| 2 | `src/types/index.ts` | 101 | TypeScript types |
| 3 | `src/lib/supabase.ts` | 47 | Client exports |
| 4 | `src/lib/supabase-client.ts` | 8 | Browser client |
| 5 | `src/lib/supabase-server.ts` | 40 | Server client |
| 6 | `src/lib/rag.ts` | 253 | RAG + caching |
| 7 | `src/lib/validations.ts` | 22 | Zod schemas |
| 8 | `src/lib/utils/index.ts` | 16 | Utilities |
| 9 | `src/lib/gemini.ts` | 173 | Gemini API |
| 10 | `src/lib/chunker.ts` | ~150 | Text chunking |
| 11 | `src/app/auth/login/page.tsx` | ~100 | Login UI |
| 12 | `src/app/auth/register/page.tsx` | ~120 | Register UI |
| 13 | `src/app/diagrams/page.tsx` | ~350 | Diagram UI |
| 14 | `src/app/api/auth/login/route.ts` | ~50 | Login API |
| 15 | `src/app/api/auth/register/route.ts` | ~55 | Register API |
| 16 | `src/app/api/auth/logout/route.ts` | ~20 | Logout API |
| 17 | `src/app/api/auth/callback/route.ts` | ~15 | OAuth callback |
| 18 | `src/app/api/diagrams/chat/route.ts` | ~102 | Diagram Q&A |
| 19 | `src/app/api/diagrams/list/route.ts` | ~50 | List diagrams |
| 20 | `supabase-migration-v2.sql` | ~150 | DB migration |
| 21 | `README.md` | ~200 | Documentation |
| 22 | `AGENTS.md` | ~100 | Dev guide |

**Total:** ~1,700 lines of new/modified code

---

## 10. FLOW DIAGRAMS

### User Registration Flow
```
/auth/register → Form Submit → /api/auth/register → Supabase Auth
                                                        ↓
                                              User Created
                                                        ↓
                                              Redirect /chat
```

### Document Upload Flow
```
/upload (Protected) → Drag & Drop PDF
                            ↓
                    POST /api/upload-document
                            ↓
                    Auth check → Extract text → Chunk → Embeddings
                                                      ↓
                                              Store with user_id
```

### Chat Flow
```
/chat (Protected) → Type Question
                           ↓
                   POST /api/chat
                           ↓
                   Auth check → Generate embedding
                                        ↓
                                Vector Search (user_id filter)
                                        ↓
                                Gemini Response (streaming)
```

### Diagram Interaction Flow
```
/diagrams (Protected) → Browse Diagrams
                                  ↓
                          Select (single or multiple)
                                  ↓
                          Type Question
                                  ↓
                          POST /api/diagrams/chat
                                  ↓
                          Gemini Explanation
```

---

## 11. CURRENT ISSUES

### Issue 1: Middleware Bug ⚠️ CRITICAL
**File:** `src/middleware.ts`
**Problem:** Routes `/chat`, `/upload`, `/diagrams`, `/dashboard` are NOT protected
**Impact:** Anyone can access without login
**Fix:** Update redirect logic (see Section 7)

### Issue 2: Database Schema Mismatch ⚠️ CRITICAL
**File:** `supabase-migration-v2.sql`
**Problem:** `user_id` columns don't exist yet
**Impact:** API routes will fail
**Fix:** Execute migration in Supabase

### Issue 3: Old Code Deployed
**Location:** Vercel deployment
**Problem:** Using old code without auth
**Fix:** Push fixed code to GitHub

---

## 12. ACTION CHECKLIST

- [ ] 1. Run `supabase-migration-v2.sql` in Supabase
- [ ] 2. Fix `src/middleware.ts` redirect logic
- [ ] 3. Commit and push to `feat/light-ui-production`
- [ ] 4. Wait for Vercel deployment
- [ ] 5. Test login/registration
- [ ] 6. Test document upload
- [ ] 7. Test chat
- [ ] 8. Test diagram interaction

---

## 13. FREQUENTLY ASKED QUESTIONS

### Q: Why is middleware buggy?
A: The `isPublicPage` variable was defined but not used in the redirect condition. Only `isAuthPage` and `isStaticFile` were checked.

### Q: Can I test without running migration?
A: No. The API routes expect `user_id` columns which don't exist in the current schema.

### Q: What happens to existing documents?
A: The migration sets a default `user_id` ('00000000-0000-0000-0000-000000000000') for existing rows.

### Q: Can I revert?
A: Yes. Switch back to `main` branch to use the old working version.

---

## 14. CONTACT & SUPPORT

- **GitHub Issues:** https://github.com/tusharsharma20021114-rgb/Multimodal-Open-Science-Patent-Interrogator/issues
- **Supabase Dashboard:** https://supabase.com/dashboard
- **Vercel Dashboard:** https://vercel.com/dashboard

---

*Last Updated: April 2026*
*Branch: feat/light-ui-production*
