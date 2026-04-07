import Link from "next/link";
import {
  Upload,
  MessageSquare,
  BarChart3,
  Eye,
  Cpu,
  Database,
  Zap,
  Sparkles,
} from "lucide-react";

export default function HomePage() {
  return (
    <>
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-badge">
            <Sparkles size={13} />
            Powered by Gemini AI — Free Tier
          </div>
          <h1>
            Multimodal{" "}
            <span className="gradient-text">RAG Engine</span>
            <br />
            for Science & Patents
          </h1>
          <p>
            Upload scientific papers, automatically extract diagrams with
            in-browser AI vision, and interrogate your documents with a
            retrieval-augmented generation pipeline.
          </p>
          <div className="hero-actions">
            <Link href="/upload" className="btn-primary">
              <Upload size={17} />
              Upload Document
            </Link>
            <Link href="/chat" className="btn-secondary">
              <MessageSquare size={17} />
              Start Chat
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="features-grid">
        <div className="glass-card feature-card">
          <div
            className="feature-icon"
            style={{ background: "rgba(139, 92, 246, 0.1)", color: "#a78bfa" }}
          >
            <Upload size={22} />
          </div>
          <h3 className="feature-title">Smart PDF Ingestion</h3>
          <p className="feature-desc">
            Upload any PDF. The engine extracts text, splits it into
            math-aware contextual chunks with overlap, and generates vector
            embeddings for semantic search.
          </p>
        </div>

        <div className="glass-card feature-card">
          <div
            className="feature-icon"
            style={{ background: "rgba(20, 184, 166, 0.1)", color: "#5eead4" }}
          >
            <Eye size={22} />
          </div>
          <h3 className="feature-title">Browser AI Vision</h3>
          <p className="feature-desc">
            DETR object detection runs in your browser via Transformers.js.
            Diagrams, charts, and figures are automatically detected and
            cropped — zero server cost.
          </p>
        </div>

        <div className="glass-card feature-card">
          <div
            className="feature-icon"
            style={{ background: "rgba(59, 130, 246, 0.1)", color: "#93c5fd" }}
          >
            <Cpu size={22} />
          </div>
          <h3 className="feature-title">Multimodal RAG Chat</h3>
          <p className="feature-desc">
            Ask questions about your documents. The engine retrieves relevant
            chunks with similarity scores and generates detailed streaming
            responses with Gemini.
          </p>
        </div>

        <div className="glass-card feature-card">
          <div
            className="feature-icon"
            style={{ background: "rgba(16, 185, 129, 0.1)", color: "#6ee7b7" }}
          >
            <Database size={22} />
          </div>
          <h3 className="feature-title">Vector Database</h3>
          <p className="feature-desc">
            Supabase PostgreSQL with pgvector. HNSW indexing enables
            blazing-fast cosine similarity search across all your document
            embeddings.
          </p>
        </div>

        <div className="glass-card feature-card">
          <div
            className="feature-icon"
            style={{ background: "rgba(245, 158, 11, 0.1)", color: "#fcd34d" }}
          >
            <BarChart3 size={22} />
          </div>
          <h3 className="feature-title">Analytics Dashboard</h3>
          <p className="feature-desc">
            Monitor real-time metrics: document count, embedding coverage,
            query volume, and extraction statistics — visualized with
            interactive charts.
          </p>
        </div>

        <div className="glass-card feature-card">
          <div
            className="feature-icon"
            style={{ background: "rgba(244, 63, 94, 0.1)", color: "#fda4af" }}
          >
            <Zap size={22} />
          </div>
          <h3 className="feature-title">Zero-Cost Stack</h3>
          <p className="feature-desc">
            Deploys on Vercel free tier. Supabase free for database and
            storage, Gemini free for AI — fully operational at zero cost.
          </p>
        </div>
      </section>
    </>
  );
}
