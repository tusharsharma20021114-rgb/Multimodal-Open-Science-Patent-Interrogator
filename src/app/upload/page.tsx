"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  Eye,
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
    setStatusMsg("Uploading PDF to storage...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      setProgress(30);
      setStatusMsg("Extracting text and generating embeddings...");

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
      setStatusMsg("Processing complete!");
      setToast({
        type: "success",
        msg: `"${data.title}" uploaded — ${data.chunks} chunks created from ${data.pages} pages`,
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
        <h1 className="page-title">Upload Documents</h1>
        <p className="page-subtitle">
          Upload PDF documents to extract text, generate embeddings, and detect
          diagrams
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
              size={48}
              style={{ margin: "0 auto 1rem", animation: "spin 1s linear infinite" }}
              color="var(--accent-blue)"
            />
            <p style={{ color: "var(--text-primary)", fontWeight: 600 }}>
              {statusMsg}
            </p>
            <div className="progress-bar" style={{ maxWidth: 400, margin: "1rem auto 0" }}>
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </>
        ) : (
          <>
            <Upload
              size={48}
              style={{ margin: "0 auto 1rem", opacity: 0.5 }}
              color="var(--accent-blue)"
            />
            <p style={{ color: "var(--text-primary)", fontWeight: 600, marginBottom: 8 }}>
              {isDragActive
                ? "Drop your PDF here..."
                : "Drag & drop a PDF file here"}
            </p>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
              or click to browse — supports any PDF document
            </p>
          </>
        )}
      </div>

      {/* Document List */}
      {documents.length > 0 && (
        <div style={{ marginTop: "2rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1rem" }}>
            Uploaded Documents
          </h2>
          <div className="doc-list">
            {documents.map((doc) => (
              <div key={doc.id} className="glass-card doc-item">
                <div className="doc-item-info">
                  <div className="doc-item-icon">
                    <FileText size={20} />
                  </div>
                  <div className="doc-item-meta">
                    <span className="doc-item-title">{doc.title}</span>
                    <span className="doc-item-subtitle">
                      {doc.total_chunks} chunks •{" "}
                      {doc.diagrams_extracted || 0} diagrams •{" "}
                      {new Date(doc.upload_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span className="doc-item-badge">
                    <CheckCircle
                      size={12}
                      style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }}
                    />
                    Indexed
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteDoc(doc.id);
                    }}
                    style={{
                      background: "rgba(244,63,94,0.1)",
                      border: "1px solid rgba(244,63,94,0.2)",
                      borderRadius: 8,
                      padding: "6px 8px",
                      cursor: "pointer",
                      color: "var(--accent-rose)",
                      display: "flex",
                      alignItems: "center",
                    }}
                    title="Delete document"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === "success" ? (
            <CheckCircle size={16} />
          ) : (
            <AlertCircle size={16} />
          )}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
