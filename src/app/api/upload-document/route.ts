import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase";
import { chunkText } from "@/lib/chunker";
import { generateEmbeddingsBatched } from "@/lib/rag";

const pdfParseModule = require("pdf-parse");

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const supabaseClient = await createClient();

    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;
    const serviceSupabase = createServiceClient();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file || file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Please upload a valid PDF file" },
        { status: 400 }
      );
    }

    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    // 1. Upload raw PDF safely using Service Role
    const { error: uploadError } = await serviceSupabase.storage
      .from("document-assets")
      .upload(`pdfs/${userId}/${fileName}`, buffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload PDF to storage" },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = serviceSupabase.storage
      .from("document-assets")
      .getPublicUrl(`pdfs/${userId}/${fileName}`);

    // 2. Parse PDF text & Diagrams
    let rawText = "";
    let diagramCount = 0;
    let diagramsToInsert: any[] = [];
    const numPages = 1; // Default fallback

    const unstructuredKey = process.env.UNSTRUCTURED_API_KEY;

    if (unstructuredKey && unstructuredKey.trim().length > 0) {
      try {
        const unstrFormData = new FormData();
        unstrFormData.append("files", file);
        unstrFormData.append("strategy", "hi_res");
        unstrFormData.append("extract_image_block_types", '["Image", "Table"]');

        const unstrRes = await fetch("https://api.unstructuredapp.io/general/v0/general", {
          method: "POST",
          headers: {
            "unstructured-api-key": unstructuredKey,
            accept: "application/json",
          },
          body: unstrFormData,
        });

        if (!unstrRes.ok) {
          throw new Error(`Unstructured API failed: ${await unstrRes.text()}`);
        }

        const elements = await unstrRes.json();
        for (const el of elements) {
          if (["Title", "NarrativeText", "ListItem", "Text"].includes(el.type)) {
            rawText += el.text + "\n\n";
          }
          if (["Image", "Table", "Figure"].includes(el.type) && el.metadata?.image_base64) {
             diagramCount++;
             const pageNum = el.metadata.page_number || 1;
             const imgBuffer = Buffer.from(el.metadata.image_base64, "base64");
             const imgFileName = `pdfs/${userId}/${fileName.replace(".pdf", "")}_diagram_${diagramCount}.png`;

             const { error: upErr } = await serviceSupabase.storage
               .from("document-assets")
               .upload(imgFileName, imgBuffer, { contentType: "image/png" });

             if (!upErr) {
               const { data: { publicUrl: imgUrl } } = serviceSupabase.storage.from("document-assets").getPublicUrl(imgFileName);
               diagramsToInsert.push({
                 user_id: userId,
                 page_number: pageNum,
                 image_url: imgUrl,
                 label: `${el.type} ${diagramCount}`
               });
             }
          }
        }
      } catch (err) {
        console.error("Unstructured API error, falling back to pdf-parse.", err);
      }
    }

    if (!rawText.trim()) {
      // Fallback
      // @ts-expect-error - Next.js server-side dynamic import workaround
      const pdfParseModule = await import("pdf-parse/lib/pdf-parse.js");
      const pdfParse = pdfParseModule.default || pdfParseModule;
      const pdfData = await pdfParse(buffer);
      rawText = pdfData.text;

      const figureMatches = rawText.match(/(?:Fig(?:ure)?\.?\s*\d+|TABLE\s+[IVX\d]+)/gi);
      diagramCount = new Set((figureMatches || []).map((m: string) => m.replace(/\s+/g, " ").toLowerCase())).size;
    }

    const chunks = chunkText(rawText, 1000, 200);

    const { data: doc, error: docError } = await serviceSupabase
      .from("documents")
      .insert({
        user_id: userId,
        title: file.name.replace(".pdf", ""),
        metadata: {
          pages: pdfData.numpages,
          size: file.size,
          originalName: file.name,
        },
        file_url: publicUrl,
        total_chunks: chunks.length,
        diagrams_extracted: diagramCount,
      })
      .select("id")
      .single();

    if (docError || !doc) {
      console.error("Document insert error:", docError);
      return NextResponse.json(
        { error: "Failed to create document record" },
        { status: 500 }
      );
    }

    if (diagramsToInsert.length > 0) {
      const dbDiagrams = diagramsToInsert.map(d => ({ ...d, document_id: doc.id }));
      const { error: diagramErr } = await serviceSupabase.from("diagrams").insert(dbDiagrams);
      if (diagramErr) console.error("Diagram insert error:", diagramErr);
    }

    const embeddings = await generateEmbeddingsBatched(
      chunks,
      userId,
      serviceSupabase
    );

    const chunkRows = chunks.map((text, i) => ({
      user_id: userId,
      document_id: doc.id,
      chunk_index: i,
      text_content: text,
      embedding: JSON.stringify(embeddings[i]),
    }));

    for (let i = 0; i < chunkRows.length; i += 20) {
      const batch = chunkRows.slice(i, i + 20);
      const { error: chunkError } = await serviceSupabase
        .from("document_chunks")
        .insert(batch);

      if (chunkError) {
        console.error("Chunk insert error:", chunkError);
      }
    }

    return NextResponse.json({
      success: true,
      documentId: doc.id,
      title: file.name.replace(".pdf", ""),
      chunks: chunks.length,
      pages: pdfData.numpages,
    });
  } catch (error) {
    console.error("Upload processing error:", error);
    const errorMessage = error instanceof Error ? error.stack || error.message : String(error);
    return NextResponse.json(
      { error: "Internal server error during processing", details: errorMessage },
      { status: 500 }
    );
  }
}
