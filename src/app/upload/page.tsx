"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  Trash2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Document {
  id: string;
  title: string;
  total_chunks: number;
  diagrams_extracted: number;
  upload_date: string;
}

export default function UploadPage() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState("");
  const [toast, setToast] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);

  useEffect(() => {
    loadDocuments();
  }, []);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  async function loadDocuments() {
    const { data } = await supabase
      .from("documents")
      .select("id, title, total_chunks, diagrams_extracted, upload_date")
      .order("upload_date", { ascending: false });
    if (data) setDocuments(data);
  }

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      setToast({ type: "error", msg: "Only PDF files are accepted" });
      return;
    }

    setUploading(true);
    setProgress(10);
    setStatusMsg("Uploading...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      setProgress(30);
      setStatusMsg("Extracting text & generating embeddings...");

      const res = await fetch("/api/upload-document", {
        method: "POST",
        body: formData,
      });

      setProgress(80);

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }

      const data = await res.json();
      setProgress(100);
      setStatusMsg("Done!");
      setToast({
        type: "success",
        msg: `"${data.title}" — ${data.chunks} chunks from ${data.pages} pages`,
      });
      loadDocuments();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setToast({ type: "error", msg });
      setStatusMsg("");
    } finally {
      setTimeout(() => {
        setUploading(false);
        setProgress(0);
        setStatusMsg("");
      }, 2000);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    disabled: uploading,
  });

  async function deleteDoc(id: string) {
    await supabase.from("documents").delete().eq("id", id);
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    setToast({ type: "success", msg: "Document deleted" });
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Upload</h1>
        <p className="page-subtitle">
          Drop a PDF to extract text, generate embeddings, and detect diagrams.
        </p>
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`dropzone ${isDragActive ? "active" : ""}`}
        id="pdf-dropzone"
      >
        <input {...getInputProps()} />
        {uploading ? (
          <>
            <Loader2
              size={32}
              style={{ margin: "0 auto 0.75rem", animation: "spin 1s linear infinite" }}
              color="var(--accent)"
            />
            <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: "0.92rem" }}>
              {statusMsg}
            </p>
            <div className="progress-bar" style={{ maxWidth: 320, margin: "0.75rem auto 0" }}>
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </>
        ) : (
          <>
            <Upload
              size={28}
              style={{ margin: "0 auto 0.75rem", opacity: 0.4 }}
              color="var(--text-secondary)"
            />
            <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: "0.92rem", marginBottom: 4 }}>
              {isDragActive ? "Drop it here..." : "Drag & drop a PDF"}
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
              or click to browse
            </p>
          </>
        )}
      </div>

      {/* Document List */}
      {documents.length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "0.75rem", letterSpacing: "-0.01em" }}>
            Documents
          </h2>
          <div className="doc-list" style={{ border: "1px solid var(--border-light)", borderRadius: "var(--radius)" }}>
            {documents.map((doc) => (
              <div key={doc.id} className="doc-item">
                <div className="doc-item-info">
                  <div className="doc-item-icon">
                    <FileText size={16} />
                  </div>
                  <div className="doc-item-meta">
                    <span className="doc-item-title">{doc.title}</span>
                    <span className="doc-item-subtitle">
                      {doc.total_chunks} chunks · {doc.diagrams_extracted || 0} diagrams · {new Date(doc.upload_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span className="doc-item-badge">
                    <CheckCircle size={10} style={{ display: "inline", verticalAlign: "middle", marginRight: 3 }} />
                    Indexed
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteDoc(doc.id);
                    }}
                    style={{
                      background: "var(--error-light)",
                      border: "1px solid rgba(220,38,38,0.1)",
                      borderRadius: 6,
                      padding: "5px 6px",
                      cursor: "pointer",
                      color: "var(--error)",
                      display: "flex",
                      alignItems: "center",
                    }}
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === "success" ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
