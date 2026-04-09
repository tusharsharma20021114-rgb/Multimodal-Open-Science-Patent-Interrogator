"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Send, Loader2, FileText, ImageIcon, LogOut, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { supabase } from "@/lib/supabase-client";
import type { ChatMessage, Doc, DiagramListItem } from "@/types";

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [diagrams, setDiagrams] = useState<DiagramListItem[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<string>("");
  const [user, setUser] = useState<{ email: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }
      setUser({ email: user.email || "" });

      const [docsRes, diagramsRes] = await Promise.all([
        supabase
          .from("documents")
          .select("id, title")
          .eq("user_id", user.id)
          .order("upload_date", { ascending: false }),
        supabase
          .from("diagrams")
          .select("id, document_id, page_number, image_url, label")
          .eq("user_id", user.id)
          .limit(20),
      ]);

      if (docsRes.data) setDocuments(docsRes.data);
      if (diagramsRes.data) setDiagrams(diagramsRes.data);
    }
    init();
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  async function handleSend() {
    const query = input.trim();
    if (!query || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: query }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          documentId: selectedDoc || undefined,
        }),
      });

      if (!res.ok) throw new Error("Failed to get response");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let fullText = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;

        const metaMatch = fullText.match(/<!--META:(.+?)-->/);
        const displayText = fullText.replace(/\n<!--META:.+?-->/, "");

        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === "assistant") {
            last.content = displayText;
            if (metaMatch) {
              try {
                const meta = JSON.parse(metaMatch[1]);
                if (meta.images?.length) last.images = meta.images;
              } catch { /* ignore */ }
            }
          }
          return [...updated];
        });
      }
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
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="chat-container">
      <header className="chat-header">
        <div className="header-left">
          <FileText size={18} />
          <select
            className="select-field"
            value={selectedDoc}
            onChange={(e) => setSelectedDoc(e.target.value)}
          >
            <option value="">All documents</option>
            {documents.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.title}
              </option>
            ))}
          </select>
        </div>
        <div className="header-right">
          <span className="user-email">
            <User size={14} />
            {user?.email}
          </span>
          <button onClick={handleLogout} className="btn-icon" title="Sign out">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="empty-state">
            <h2>Ask your paper anything</h2>
            <p>
              Select a document above, then ask about its methods, equations,
              results, or diagrams.
            </p>
            {diagrams.length > 0 && (
              <div className="diagrams-hint">
                <ImageIcon size={16} />
                <span>{diagrams.length} diagrams available for analysis</span>
              </div>
            )}
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
            {msg.images && msg.images.length > 0 && (
              <div className="diagram-gallery">
                {msg.images.map((url, j) => (
                  <div key={j} className="diagram-thumbnail">
                    <img src={url} alt={`Diagram ${j + 1}`} />
                    <div className="diagram-label">
                      <ImageIcon size={12} />
                      Diagram
                    </div>
                  </div>
                ))}
              </div>
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
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <textarea
          ref={inputRef}
          className="chat-input"
          placeholder="Ask a question..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={loading}
        />
        <button
          className="btn-primary"
          onClick={handleSend}
          disabled={loading || !input.trim()}
        >
          {loading ? <Loader2 size={16} className="spinner" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
}
