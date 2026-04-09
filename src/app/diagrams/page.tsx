"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ImageIcon,
  Send,
  Loader2,
  ChevronLeft,
  Maximize2,
  X,
  MessageSquare,
  Layers,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { supabase } from "@/lib/supabase-client";
import type { Diagram } from "@/types";

interface DiagramMessage {
  role: "user" | "assistant";
  content: string;
}

export default function DiagramsPage() {
  const router = useRouter();
  const [diagrams, setDiagrams] = useState<Diagram[]>([]);
  const [documents, setDocuments] = useState<{ id: string; title: string }[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<string>("");
  const [selectedDiagram, setSelectedDiagram] = useState<Diagram | null>(null);
  const [multiSelect, setMultiSelect] = useState<Diagram[]>([]);
  const [mode, setMode] = useState<"single" | "multiple">("single");
  const [messages, setMessages] = useState<DiagramMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [loadingDiagrams, setLoadingDiagrams] = useState(true);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }

      const [docsRes, diagramsRes] = await Promise.all([
        supabase
          .from("documents")
          .select("id, title")
          .eq("user_id", user.id)
          .order("upload_date", { ascending: false }),
        supabase
          .from("diagrams")
          .select("*")
          .eq("user_id", user.id)
          .order("page_number", { ascending: true }),
      ]);

      if (docsRes.data) setDocuments(docsRes.data);
      if (diagramsRes.data) setDiagrams(diagramsRes.data);
      setLoadingDiagrams(false);
    }
    init();
  }, [router]);

  const filteredDiagrams = selectedDoc
    ? diagrams.filter((d) => d.document_id === selectedDoc)
    : diagrams;

  async function handleAsk() {
    const question = input.trim();
    if (!question || loading) return;

    if (mode === "single" && !selectedDiagram) {
      alert("Please select a diagram to ask about");
      return;
    }

    if (mode === "multiple" && multiSelect.length === 0) {
      alert("Please select at least one diagram");
      return;
    }

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setLoading(true);

    try {
      const body: { diagramId?: string; diagramIds?: string[]; question: string } = {
        question,
      };

      if (mode === "single" && selectedDiagram) {
        body.diagramId = selectedDiagram.id;
      } else if (mode === "multiple") {
        body.diagramIds = multiSelect.map((d) => d.id);
      }

      const res = await fetch("/api/diagrams/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Failed to get response");

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.explanation },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  }

  function toggleMultiSelect(diagram: Diagram) {
    setMultiSelect((prev) => {
      const exists = prev.find((d) => d.id === diagram.id);
      if (exists) {
        return prev.filter((d) => d.id !== diagram.id);
      }
      return [...prev, diagram];
    });
  }

  return (
    <div className="diagrams-page">
      <aside className="diagrams-sidebar">
        <div className="sidebar-header">
          <h2>
            <ImageIcon size={18} />
            Diagrams
          </h2>
          <span className="diagram-count">{filteredDiagrams.length} total</span>
        </div>

        <div className="sidebar-filters">
          <select
            value={selectedDoc}
            onChange={(e) => setSelectedDoc(e.target.value)}
            className="select-field"
          >
            <option value="">All documents</option>
            {documents.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.title}
              </option>
            ))}
          </select>

          <div className="mode-toggle">
            <button
              className={mode === "single" ? "active" : ""}
              onClick={() => setMode("single")}
            >
              Single
            </button>
            <button
              className={mode === "multiple" ? "active" : ""}
              onClick={() => setMode("multiple")}
            >
              <Layers size={14} />
              Compare
            </button>
          </div>
        </div>

        {loadingDiagrams ? (
          <div className="loading-state">
            <Loader2 size={24} className="spinner" />
            <span>Loading diagrams...</span>
          </div>
        ) : filteredDiagrams.length === 0 ? (
          <div className="empty-diagrams">
            <ImageIcon size={32} />
            <p>No diagrams found</p>
            <span>Upload a document to extract diagrams</span>
          </div>
        ) : (
          <div className="diagrams-grid">
            {filteredDiagrams.map((diagram) => {
              const isSelected =
                mode === "single"
                  ? selectedDiagram?.id === diagram.id
                  : multiSelect.some((d) => d.id === diagram.id);

              return (
                <div
                  key={diagram.id}
                  className={`diagram-card ${isSelected ? "selected" : ""}`}
                  onClick={() => {
                    if (mode === "single") {
                      setSelectedDiagram(diagram);
                    } else {
                      toggleMultiSelect(diagram);
                    }
                  }}
                >
                  <div className="diagram-image">
                    <img src={diagram.image_url} alt={diagram.label || "Diagram"} />
                    <button
                      className="preview-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDiagram(diagram);
                        setPreviewOpen(true);
                      }}
                    >
                      <Maximize2 size={14} />
                    </button>
                    {mode === "multiple" && (
                      <div className="checkbox">
                        {isSelected && <X size={12} />}
                      </div>
                    )}
                  </div>
                  <div className="diagram-info">
                    <span className="diagram-label">
                      {diagram.label || `Page ${diagram.page_number}`}
                    </span>
                    {diagram.confidence && (
                      <span className="confidence">
                        {(diagram.confidence * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </aside>

      <main className="diagram-chat">
        <div className="chat-header">
          <h3>
            <MessageSquare size={18} />
            Ask about diagrams
          </h3>
          {mode === "multiple" && multiSelect.length > 0 && (
            <span className="selected-count">
              {multiSelect.length} diagrams selected
            </span>
          )}
        </div>

        {mode === "single" && selectedDiagram && (
          <div className="selected-diagram-preview">
            <img src={selectedDiagram.image_url} alt="Selected diagram" />
          </div>
        )}

        {mode === "multiple" && multiSelect.length > 0 && (
          <div className="multi-preview">
            {multiSelect.map((d) => (
              <div key={d.id} className="multi-thumb">
                <img src={d.image_url} alt="" />
                <button onClick={() => toggleMultiSelect(d)}>
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="empty-chat">
              <MessageSquare size={32} />
              <p>
                {mode === "single" && selectedDiagram
                  ? `Ask questions about this diagram`
                  : mode === "multiple" && multiSelect.length > 0
                  ? `Compare and analyze ${multiSelect.length} diagrams together`
                  : "Select a diagram to start asking questions"}
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`message-bubble ${msg.role}`}>
              {msg.role === "assistant" ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                >
                  {msg.content}
                </ReactMarkdown>
              ) : (
                msg.content
              )}
            </div>
          ))}

          {loading && (
            <div className="message-bubble assistant">
              <div className="typing-indicator">
                <span /><span /><span />
              </div>
            </div>
          )}
        </div>

        <div className="chat-input-area">
          <textarea
            className="chat-input"
            placeholder={
              mode === "single"
                ? "Ask about this diagram..."
                : "Ask about multiple diagrams..."
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={loading}
          />
          <button
            className="btn-primary"
            onClick={handleAsk}
            disabled={loading || !input.trim()}
          >
            {loading ? <Loader2 size={16} className="spinner" /> : <Send size={16} />}
          </button>
        </div>
      </main>

      {previewOpen && selectedDiagram && (
        <div className="preview-modal" onClick={() => setPreviewOpen(false)}>
          <button className="close-btn" onClick={() => setPreviewOpen(false)}>
            <X size={24} />
          </button>
          <img
            src={selectedDiagram.image_url}
            alt={selectedDiagram.label || "Diagram"}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
