"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, FileText, ImageIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { supabase } from "@/lib/supabase";

interface Message {
  role: "user" | "assistant";
  content: string;
  images?: string[];
}

interface Doc {
  id: string;
  title: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    supabase
      .from("documents")
      .select("id, title")
      .order("upload_date", { ascending: false })
      .then(({ data }) => {
        if (data) setDocuments(data);
      });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
          content: "Sorry, something went wrong. Check your API keys and try again.",
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
      {/* Document selector — minimal */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          paddingBottom: 8,
          borderBottom: "1px solid var(--border-light)",
        }}
      >
        <FileText size={14} color="var(--text-muted)" />
        <select
          className="select-field"
          value={selectedDoc}
          onChange={(e) => setSelectedDoc(e.target.value)}
          style={{ flex: 1, maxWidth: 320 }}
        >
          <option value="">All documents</option>
          {documents.map((doc) => (
            <option key={doc.id} value={doc.id}>
              {doc.title}
            </option>
          ))}
        </select>
        <div className="pulse-dot" title="Connected" />
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <p
              style={{
                fontSize: "1.5rem",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                color: "var(--text-primary)",
              }}
            >
              Ask your paper anything
            </p>
            <p
              style={{
                color: "var(--text-muted)",
                fontSize: "0.88rem",
                maxWidth: 380,
                textAlign: "center",
                lineHeight: 1.5,
              }}
            >
              Select a document above, then ask about its methods, equations,
              results, or diagrams.
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
            {msg.images && msg.images.length > 0 && (
              <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                {msg.images.map((url, j) => (
                  <div
                    key={j}
                    style={{
                      border: "1px solid var(--border-light)",
                      borderRadius: 8,
                      overflow: "hidden",
                      maxWidth: 180,
                    }}
                  >
                    <div
                      style={{
                        padding: "3px 6px",
                        background: "var(--bg-muted)",
                        fontSize: "0.7rem",
                        display: "flex",
                        alignItems: "center",
                        gap: 3,
                        color: "var(--text-muted)",
                        fontWeight: 500,
                      }}
                    >
                      <ImageIcon size={9} />
                      Diagram
                    </div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Diagram ${j + 1}`} style={{ width: "100%", display: "block" }} />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="message-bubble assistant">
            <div className="typing-indicator">
              <span />
              <span />
              <span />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
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
          style={{ padding: "11px 14px" }}
        >
          {loading ? <Loader2 size={16} className="spinner" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
}
