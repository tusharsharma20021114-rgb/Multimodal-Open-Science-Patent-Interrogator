import Link from "next/link";
import {
  Upload,
  MessageSquare,
  BarChart3,
  Eye,
  Cpu,
  Database,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export default function HomePage() {
  return (
    <>
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <div className="hero-badge">
            <Sparkles size={14} />
            Powered by Gemini AI — Free Tier
          </div>
          <h1>
            Multimodal{" "}
            <span className="gradient-text">RAG Engine</span>
            <br />
            for Science & Patents
          </h1>
          <p>
            Upload scientific papers and patents, automatically extract diagrams
            with in-browser AI vision, and interrogate your documents with a
            multimodal retrieval-augmented generation pipeline.
          </p>
          <div className="hero-actions">
            <Link href="/upload" className="btn-primary">
              <Upload size={18} />
              Upload Document
            </Link>
            <Link href="/chat" className="btn-secondary">
              <MessageSquare size={18} />
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
            style={{ background: "rgba(99, 102, 241, 0.1)", color: "#6366f1" }}
          >
            <Upload size={24} />
          </div>
          <h3 className="feature-title">Smart PDF Ingestion</h3>
          <p className="feature-desc">
            Upload any PDF document. The engine automatically extracts text,
            splits it into contextual chunks with overlap, and generates vector
            embeddings for semantic search.
          </p>
        </div>

        <div className="glass-card feature-card">
          <div
            className="feature-icon"
            style={{ background: "rgba(6, 182, 212, 0.1)", color: "#06b6d4" }}
          >
            <Eye size={24} />
          </div>
          <h3 className="feature-title">Browser AI Vision</h3>
          <p className="feature-desc">
            DETR object detection runs directly in your browser via
            Transformers.js. Diagrams, charts, and figures are automatically
            detected and cropped — zero server cost.
          </p>
        </div>

        <div className="glass-card feature-card">
          <div
            className="feature-icon"
            style={{
              background: "rgba(139, 92, 246, 0.1)",
              color: "#8b5cf6",
            }}
          >
            <Cpu size={24} />
          </div>
          <h3 className="feature-title">Multimodal RAG Chat</h3>
          <p className="feature-desc">
            Ask questions about your documents. The engine retrieves the most
            relevant text chunks and associated diagrams, then generates a
            streaming response with Gemini 1.5 Flash.
          </p>
        </div>

        <div className="glass-card feature-card">
          <div
            className="feature-icon"
            style={{
              background: "rgba(16, 185, 129, 0.1)",
              color: "#10b981",
            }}
          >
            <Database size={24} />
          </div>
          <h3 className="feature-title">Vector Database</h3>
          <p className="feature-desc">
            Powered by Supabase PostgreSQL with pgvector. HNSW indexing enables
            blazing-fast cosine similarity search across all your document
            embeddings.
          </p>
        </div>

        <div className="glass-card feature-card">
          <div
            className="feature-icon"
            style={{
              background: "rgba(245, 158, 11, 0.1)",
              color: "#f59e0b",
            }}
          >
            <BarChart3 size={24} />
          </div>
          <h3 className="feature-title">Analytics Dashboard</h3>
          <p className="feature-desc">
            Monitor system health with real-time metrics: document count,
            embedding coverage, query volume, and extraction statistics —
            visualized with interactive charts.
          </p>
        </div>

        <div className="glass-card feature-card">
          <div
            className="feature-icon"
            style={{
              background: "rgba(244, 63, 94, 0.1)",
              color: "#f43f5e",
            }}
          >
            <ArrowRight size={24} />
          </div>
          <h3 className="feature-title">Vercel + Free Stack</h3>
          <p className="feature-desc">
            Deploys on Vercel free tier. Uses Supabase free tier for database
            and storage, Gemini free tier for AI — fully operational at zero
            cost.
          </p>
        </div>
      </section>
    </>
  );
}
