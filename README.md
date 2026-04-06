# Multimodal RAG Engine

A full-stack **Multimodal Open-Science & Patent Interrogator** built with Next.js, Supabase, Gemini AI, and Transformers.js. Upload scientific papers and patents, automatically extract diagrams with in-browser AI vision, and query your documents with a multimodal RAG pipeline.

## 🚀 Tech Stack (All Free Tier)

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14+ (App Router, TypeScript) |
| Styling | Tailwind CSS + Custom Glassmorphism CSS |
| Database | Supabase PostgreSQL + pgvector |
| Storage | Supabase Storage (S3-compatible) |
| PDF Parsing | pdf-parse (server-side) |
| Vision ML | Transformers.js (DETR ResNet-50, in-browser) |
| Embeddings | Gemini text-embedding-004 (768-dim) |
| Chat LLM | Gemini 1.5 Flash (streaming) |
| Charts | Recharts |
| Deployment | Vercel |

## 📋 Setup Instructions

### 1. Clone and Install
```bash
git clone <your-repo-url>
cd multimodal-rag-engine
npm install
```

### 2. Supabase Setup (Free Tier)
1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase-migration.sql`
3. Go to **Storage** → Create a new bucket named `document-assets` (set to public)
4. Go to **Settings** → **API** → Copy your project URL and keys

### 3. Gemini API Key (Free Tier)
1. Go to [aistudio.google.com](https://aistudio.google.com)
2. Get a free API key
3. Free tier: 15 RPM, 1M tokens/day

### 4. Environment Variables
Copy `.env.example` to `.env.local` and fill in your keys:
```bash
cp .env.example .env.local
```

### 5. Run Locally
```bash
npm run dev
```

### 6. Deploy to Vercel
1. Push to GitHub
2. Import the repository at [vercel.com](https://vercel.com)
3. Add environment variables in Vercel project settings
4. Deploy!
