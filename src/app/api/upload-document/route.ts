import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase";
import { chunkText } from "@/lib/chunker";
import { generateEmbeddingsBatched } from "@/lib/rag";

const pdfParseModule = require("pdf-parse");

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const supabaseClient = await createClient();

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

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
    const { error: uploadError } = await serviceSupabase.storage
      .from("document-assets")
      .upload(`pdfs/${userId}/${fileName}`, buffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
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

    const pdfData = await pdfParseModule.default(buffer);
    const rawText = pdfData.text;

    if (!rawText || rawText.trim().length === 0) {
      return NextResponse.json(
        { error: "Could not extract text from PDF" },
        { status: 422 }
      );
    }

    const chunks = chunkText(rawText, 1000, 200);

    const figureMatches = rawText.match(
      /(?:Fig(?:ure)?\.?\s*\d+|TABLE\s+[IVX\d]+)/gi
    );
    const uniqueFigures = new Set(
      (figureMatches || []).map((m: string) =>
        m.replace(/\s+/g, " ").toLowerCase()
      )
    );
    const diagramCount = uniqueFigures.size;

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
    return NextResponse.json(
      { error: "Internal server error during processing" },
      { status: 500 }
    );
  }
}
