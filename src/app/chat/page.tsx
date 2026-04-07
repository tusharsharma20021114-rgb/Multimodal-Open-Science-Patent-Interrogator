"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, FileText, Bot, User, ImageIcon } from "lucide-react";
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

      if (!res.ok) {
        throw new Error("Failed to get response");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let fullText = "";

      // Add empty assistant message
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;

        // Parse out metadata if present
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
                if (meta.images?.length) {
                  last.images = meta.images;
                }
              } catch {
                // ignore parse errors
              }
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
          content:
            "Sorry, I encountered an error. Please check that your API keys are configured and try again.",
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
      {/* Document Selector */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          paddingBottom: 8,
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <FileText size={15} color="var(--text-muted)" />
        <select
          className="select-field"
          value={selectedDoc}
          onChange={(e) => setSelectedDoc(e.target.value)}
          style={{ flex: 1, maxWidth: 360 }}
        >
          <option value="">All documents</option>
          {documents.map((doc) => (
            <option key={doc.id} value={doc.id}>
              {doc.title}
            </option>
          ))}
        </select>
        <div className="pulse-dot" title="System active" />
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
              gap: 12,
              opacity: 0.4,
            }}
          >
            <Bot size={40} strokeWidth={1.5} />
            <p style={{ fontSize: "1rem", fontWeight: 600 }}>
              Ask anything about your documents
            </p>
            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: "0.85rem",
                maxWidth: 400,
                textAlign: "center",
                lineHeight: 1.5,
              }}
            >
              The RAG engine searches through your uploaded PDFs and provides
              grounded answers with mathematical detail and chunk references.
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`message-bubble ${msg.role}`}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                marginBottom: 8,
                fontSize: "0.75rem",
                opacity: 0.6,
                fontWeight: 500,
              }}
            >
              {msg.role === "user" ? <User size={13} /> : <Bot size={13} />}
              {msg.role === "user" ? "You" : "RAG Engine"}
            </div>
            {msg.role === "assistant" ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
              >
                {msg.content}
              </ReactMarkdown>
            ) : (
              <p>{msg.content}</p>
            )}
            {msg.images && msg.images.length > 0 && (
              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                {msg.images.map((url, j) => (
                  <div
                    key={j}
                    style={{
                      border: "1px solid var(--border-subtle)",
                      borderRadius: 10,
                      overflow: "hidden",
                      maxWidth: 200,
                    }}
                  >
                    <div
                      style={{
                        padding: "4px 8px",
                        background: "rgba(139,92,246,0.08)",
                        fontSize: "0.7rem",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontWeight: 500,
                        color: "var(--text-secondary)",
                      }}
                    >
                      <ImageIcon size={10} />
                      Referenced Diagram
                    </div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Diagram ${j + 1}`}
                      style={{ width: "100%", display: "block" }}
                    />
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
          placeholder="Ask a question about your documents..."
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
          style={{ padding: "13px 16px" }}
        >
          {loading ? (
            <Loader2 size={17} className="spinner" />
          ) : (
            <Send size={17} />
          )}
        </button>
      </div>
    </div>
  );
}
