"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  Trash2,
  LogOut,
  User,
  ImageIcon,
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase-client";
import type { DocumentListItem } from "@/types";

export default function UploadPage() {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState("");
  const [toast, setToast] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [user, setUser] = useState<{ email: string } | null>(null);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }
      setUser({ email: user.email || "" });
      loadDocuments(user.id);
    }
    init();
  }, [router]);

  async function loadDocuments(userId: string) {
    const { data } = await supabase
      .from("documents")
      .select("id, title, total_chunks, diagrams_extracted, upload_date")
      .eq("user_id", userId)
      .order("upload_date", { ascending: false });
    if (data) setDocuments(data);
  }

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
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

        const { data: { user } } = await supabase.auth.getUser();
        if (user) loadDocuments(user.id);
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
    },
    []
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    disabled: uploading,
  });

  async function deleteDoc(id: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("documents")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    setToast({ type: "success", msg: "Document deleted" });
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <div className="page-container">
      <header className="page-header-full">
        <div className="header-content">
          <h1 className="page-title">Upload Documents</h1>
          <p className="page-subtitle">
            Upload PDFs to extract text, generate embeddings, and detect diagrams
          </p>
        </div>
        <div className="header-actions">
          <Link href="/diagrams" className="btn-secondary">
            <ImageIcon size={16} />
            View Diagrams
          </Link>
          <span className="user-info">
            <User size={14} />
            {user?.email}
          </span>
          <button onClick={handleLogout} className="btn-icon">
            <LogOut size={18} />
          </button>
        </div>
      </header>

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
            />
            <p style={{ fontWeight: 600, fontSize: "0.92rem" }}>
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
            />
            <p style={{ fontWeight: 600, fontSize: "0.92rem", marginBottom: 4 }}>
              {isDragActive ? "Drop it here..." : "Drag & drop a PDF"}
            </p>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
              or click to browse
            </p>
          </>
        )}
      </div>

      {documents.length > 0 && (
        <div className="documents-section">
          <h2>Your Documents</h2>
          <div className="doc-list">
            {documents.map((doc) => (
              <div key={doc.id} className="doc-item">
                <div className="doc-item-info">
                  <div className="doc-item-icon">
                    <FileText size={16} />
                  </div>
                  <div className="doc-item-meta">
                    <span className="doc-item-title">{doc.title}</span>
                    <span className="doc-item-subtitle">
                      {doc.total_chunks} chunks ·{" "}
                      {doc.diagrams_extracted || 0} diagrams ·{" "}
                      {new Date(doc.upload_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span className="doc-item-badge">
                    <CheckCircle size={10} />
                    Indexed
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteDoc(doc.id);
                    }}
                    className="btn-delete"
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
