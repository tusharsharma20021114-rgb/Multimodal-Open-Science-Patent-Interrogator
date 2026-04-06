"use client";

import { useState, useCallback } from "react";
import { Eye, Loader2, CheckCircle, AlertTriangle } from "lucide-react";

interface Detection {
  label: string;
  score: number;
  box: { xmin: number; ymin: number; xmax: number; ymax: number };
}

interface DiagramDetectorProps {
  canvas: HTMLCanvasElement | null;
  documentId: string;
  pageNumber: number;
  onDetection?: (detections: Detection[]) => void;
}

export default function DiagramDetector({
  canvas,
  documentId,
  pageNumber,
  onDetection,
}: DiagramDetectorProps) {
  const [detecting, setDetecting] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [status, setStatus] = useState<string>("");
  const [modelLoaded, setModelLoaded] = useState(false);

  const runDetection = useCallback(async () => {
    if (!canvas) return;

    setDetecting(true);
    setStatus("Loading vision model (first time may take 30s)...");

    try {
      // Dynamic import to avoid SSR issues
      const { pipeline } = await import("@xenova/transformers");

      setStatus("Running object detection...");
      setModelLoaded(true);

      // Create object detection pipeline
      const detector = await pipeline(
        "object-detection",
        "Xenova/detr-resnet-50",
        { quantized: true }
      );

      // Convert canvas to image data URL
      const imageData = canvas.toDataURL("image/png");

      // Run detection
      const output = await detector(imageData, {
        threshold: 0.5,
        percentage: true,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const results: Detection[] = (output as any[]).map(
        (d: { label: string; score: number; box: Detection["box"] }) => ({
          label: d.label,
          score: d.score,
          box: d.box,
        })
      );

      setDetections(results);
      setStatus(`Found ${results.length} objects on page ${pageNumber}`);

      if (onDetection) onDetection(results);

      // Draw bounding boxes on canvas
      const ctx = canvas.getContext("2d");
      if (ctx) {
        results.forEach((det) => {
          const x = det.box.xmin * canvas.width;
          const y = det.box.ymin * canvas.height;
          const w = (det.box.xmax - det.box.xmin) * canvas.width;
          const h = (det.box.ymax - det.box.ymin) * canvas.height;

          ctx.strokeStyle = "#6366f1";
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, w, h);

          ctx.fillStyle = "rgba(99, 102, 241, 0.1)";
          ctx.fillRect(x, y, w, h);

          ctx.fillStyle = "#6366f1";
          ctx.font = "12px Inter, sans-serif";
          ctx.fillText(
            `${det.label} (${Math.round(det.score * 100)}%)`,
            x + 4,
            y + 14
          );
        });
      }

      // Crop and upload detected diagrams
      for (let i = 0; i < results.length; i++) {
        const det = results[i];
        const x = det.box.xmin * canvas.width;
        const y = det.box.ymin * canvas.height;
        const w = (det.box.xmax - det.box.xmin) * canvas.width;
        const h = (det.box.ymax - det.box.ymin) * canvas.height;

        // Create a temporary canvas for cropping
        const cropCanvas = document.createElement("canvas");
        cropCanvas.width = w;
        cropCanvas.height = h;
        const cropCtx = cropCanvas.getContext("2d");
        if (!cropCtx) continue;

        cropCtx.drawImage(canvas, x, y, w, h, 0, 0, w, h);

        // Convert to blob and upload
        const blob = await new Promise<Blob | null>((resolve) =>
          cropCanvas.toBlob(resolve, "image/png")
        );

        if (blob) {
          const formData = new FormData();
          formData.append("image", blob, `diagram-p${pageNumber}-${i}.png`);
          formData.append("documentId", documentId);
          formData.append("chunkIndex", String(pageNumber * 3 + i)); // approximate chunk mapping

          try {
            await fetch("/api/upload-diagram", {
              method: "POST",
              body: formData,
            });
          } catch (err) {
            console.error("Diagram upload failed:", err);
          }
        }
      }
    } catch (err) {
      console.error("Detection error:", err);
      setStatus("Detection failed — model may not be supported in this browser");
    } finally {
      setDetecting(false);
    }
  }, [canvas, documentId, pageNumber, onDetection]);

  return (
    <div className="glass-card" style={{ padding: "1.25rem", marginTop: "1rem" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: detections.length > 0 ? "1rem" : 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Eye size={18} color="var(--accent-cyan)" />
          <div>
            <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>
              AI Diagram Detection
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              {status || "Runs DETR ResNet-50 in your browser via Transformers.js"}
            </div>
          </div>
        </div>
        <button
          className="btn-primary"
          onClick={runDetection}
          disabled={detecting || !canvas}
          style={{ padding: "8px 16px", fontSize: "0.85rem" }}
        >
          {detecting ? (
            <>
              <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
              Detecting...
            </>
          ) : (
            <>
              <Eye size={14} />
              {modelLoaded ? "Re-scan" : "Scan Page"}
            </>
          )}
        </button>
      </div>

      {detections.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {detections.map((det, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                background: "rgba(99,102,241,0.05)",
                borderRadius: "var(--radius-sm)",
                border: "1px solid rgba(99,102,241,0.1)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CheckCircle size={14} color="var(--accent-emerald)" />
                <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>
                  {det.label}
                </span>
              </div>
              <span
                style={{
                  fontSize: "0.8rem",
                  color: "var(--accent-blue)",
                  fontWeight: 600,
                }}
              >
                {Math.round(det.score * 100)}% confidence
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
