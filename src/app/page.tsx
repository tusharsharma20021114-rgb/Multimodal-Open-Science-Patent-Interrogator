import Link from "next/link";
import {
  Upload,
  MessageSquare,
  Layers,
  Eye,
  Search,
  Zap,
} from "lucide-react";

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-badge">Open Source · Free Tier</div>
          <h1>
            Research paper
            <br />
            <span className="gradient-text">interrogation</span>,
            <br />
            made simple.
          </h1>
          <p>
            Upload any scientific paper or patent. We extract text, detect
            diagrams, and let you have a deep conversation with your documents
            — equations, methods, and all.
          </p>
          <div className="hero-actions">
            <Link href="/upload" className="btn-primary">
              <Upload size={15} />
              Upload a paper
            </Link>
            <Link href="/chat" className="btn-secondary">
              <MessageSquare size={15} />
              Start chatting
            </Link>
          </div>
        </div>
      </section>

      {/* Features — Notion-style 1px-bordered grid */}
      <section className="features-grid">
        <div className="feature-card">
          <div
            className="feature-icon"
            style={{ background: "rgba(13, 148, 136, 0.08)", color: "#0D9488" }}
          >
            <Upload size={18} />
          </div>
          <h3 className="feature-title">PDF ingestion</h3>
          <p className="feature-desc">
            Drop a PDF. Text is extracted, split into math-aware chunks with
            overlap, and embedded as vectors for semantic search.
          </p>
        </div>

        <div className="feature-card">
          <div
            className="feature-icon"
            style={{ background: "rgba(202, 138, 4, 0.08)", color: "#CA8A04" }}
          >
            <Eye size={18} />
          </div>
          <h3 className="feature-title">Diagram detection</h3>
          <p className="feature-desc">
            DETR runs in your browser. Figures, charts, and tables are
            detected and cropped automatically — no server needed.
          </p>
        </div>

        <div className="feature-card">
          <div
            className="feature-icon"
            style={{ background: "rgba(225, 29, 72, 0.06)", color: "#E11D48" }}
          >
            <Search size={18} />
          </div>
          <h3 className="feature-title">Semantic search</h3>
          <p className="feature-desc">
            pgvector with HNSW indexing. Ask a question, and the most
            relevant chunks surface instantly via cosine similarity.
          </p>
        </div>

        <div className="feature-card">
          <div
            className="feature-icon"
            style={{ background: "rgba(37, 99, 235, 0.06)", color: "#2563EB" }}
          >
            <MessageSquare size={18} />
          </div>
          <h3 className="feature-title">RAG conversations</h3>
          <p className="feature-desc">
            Gemini generates detailed answers grounded in your paper — with
            equations explained step-by-step and chunk citations.
          </p>
        </div>

        <div className="feature-card">
          <div
            className="feature-icon"
            style={{ background: "rgba(13, 148, 136, 0.08)", color: "#0D9488" }}
          >
            <Layers size={18} />
          </div>
          <h3 className="feature-title">Math-aware chunking</h3>
          <p className="feature-desc">
            LaTeX blocks, equations, and figure captions are never split.
            Chunks respect section boundaries for coherent retrieval.
          </p>
        </div>

        <div className="feature-card">
          <div
            className="feature-icon"
            style={{ background: "rgba(202, 138, 4, 0.08)", color: "#CA8A04" }}
          >
            <Zap size={18} />
          </div>
          <h3 className="feature-title">Completely free</h3>
          <p className="feature-desc">
            Vercel, Supabase, and Gemini free tiers. A fully functional
            research assistant at zero cost.
          </p>
        </div>
      </section>
    </>
  );
}
