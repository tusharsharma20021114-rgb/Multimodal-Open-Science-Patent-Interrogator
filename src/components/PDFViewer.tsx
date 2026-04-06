"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";

interface PDFViewerProps {
  fileUrl: string;
  onPageRendered?: (canvas: HTMLCanvasElement, pageNum: number) => void;
}

export default function PDFViewer({ fileUrl, onPageRendered }: PDFViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.5);
  const [loading, setLoading] = useState(true);
  const [pdfDoc, setPdfDoc] = useState<unknown>(null);

  const renderPage = useCallback(
    async (pdf: unknown, pageNum: number) => {
      const canvas = canvasRef.current;
      if (!canvas || !pdf) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const page = await (pdf as any).getPage(pageNum);
      const viewport = page.getViewport({ scale });
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      await page.render({ canvasContext: ctx, viewport }).promise;
      setLoading(false);

      if (onPageRendered) {
        onPageRendered(canvas, pageNum);
      }
    },
    [scale, onPageRendered]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadPdf() {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

        const doc = await pdfjsLib.getDocument(fileUrl).promise;
        if (cancelled) return;

        setPdfDoc(doc);
        setNumPages(doc.numPages);
        await renderPage(doc, 1);
      } catch (err) {
        console.error("PDF load error:", err);
        setLoading(false);
      }
    }

    loadPdf();
    return () => {
      cancelled = true;
    };
  }, [fileUrl, renderPage]);

  useEffect(() => {
    if (pdfDoc) {
      renderPage(pdfDoc, currentPage);
    }
  }, [currentPage, scale, pdfDoc, renderPage]);

  return (
    <div className="glass-card" style={{ padding: "1rem", overflow: "hidden" }}>
      {/* Controls */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "1rem",
          padding: "0 0.5rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            className="btn-secondary"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            style={{ padding: "6px 10px" }}
          >
            <ChevronLeft size={16} />
          </button>
          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Page {currentPage} of {numPages}
          </span>
          <button
            className="btn-secondary"
            onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
            disabled={currentPage >= numPages}
            style={{ padding: "6px 10px" }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            className="btn-secondary"
            onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}
            style={{ padding: "6px 10px" }}
          >
            <ZoomOut size={16} />
          </button>
          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            {Math.round(scale * 100)}%
          </span>
          <button
            className="btn-secondary"
            onClick={() => setScale((s) => Math.min(3, s + 0.25))}
            style={{ padding: "6px 10px" }}
          >
            <ZoomIn size={16} />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        style={{
          overflow: "auto",
          maxHeight: "70vh",
          display: "flex",
          justifyContent: "center",
          background: "rgba(0,0,0,0.2)",
          borderRadius: "var(--radius-sm)",
        }}
      >
        {loading && (
          <div
            style={{
              padding: "4rem",
              color: "var(--text-muted)",
              textAlign: "center",
            }}
          >
            <div className="spinner" style={{ margin: "0 auto 1rem", width: 24, height: 24 }} />
            Loading PDF...
          </div>
        )}
        <canvas
          ref={canvasRef}
          style={{ display: loading ? "none" : "block", maxWidth: "100%" }}
        />
      </div>
    </div>
  );
}
