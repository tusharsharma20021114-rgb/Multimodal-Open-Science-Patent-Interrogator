import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { chunkText } from "@/lib/chunker";
import { generateEmbeddings } from "@/lib/gemini";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParseModule = require("pdf-parse");
const pdfParse = pdfParseModule.default || pdfParseModule;

export const maxDuration = 60; // Vercel free tier max

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file || file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Please upload a valid PDF file" },
        { status: 400 }
      );
    }

    const supabase = getServiceSupabase();
    const fileName = `${Date.now()}-${file.name.replace(/\s+/g, "_")}`;

    // 1. Upload raw PDF to Supabase Storage
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from("document-assets")
      .upload(`pdfs/${fileName}`, buffer, {
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
    } = supabase.storage
      .from("document-assets")
      .getPublicUrl(`pdfs/${fileName}`);

    // 2. Extract text from PDF
    const pdfData = await pdfParse(buffer);
    const rawText = pdfData.text;

    if (!rawText || rawText.trim().length === 0) {
      return NextResponse.json(
        { error: "Could not extract text from PDF" },
        { status: 422 }
      );
    }

    // 3. Chunk the text into large pieces to ensure we NEVER hit the 15 RPM API limit
    // A 15k word paper will be exactly 5 chunks.
    const chunks = chunkText(rawText, 3000, 300);

    // 3b. Count figures/diagrams referenced in the text
    const figureMatches = rawText.match(/(?:Fig(?:ure)?\.?\s*\d+|TABLE\s+[IVX\d]+)/gi);
    const uniqueFigures = new Set(
      (figureMatches || []).map((m: string) => m.replace(/\s+/g, " ").toLowerCase())
    );
    const diagramCount = uniqueFigures.size;

    // 4. Create document record
    const { data: doc, error: docError } = await supabase
      .from("documents")
      .insert({
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

    // 5. Generate embeddings and insert chunks
    const embeddings = await generateEmbeddings(chunks);

    const chunkRows = chunks.map((text, i) => ({
      document_id: doc.id,
      chunk_index: i,
      text_content: text,
      embedding: JSON.stringify(embeddings[i]),
    }));

    // Insert in batches of 20
    for (let i = 0; i < chunkRows.length; i += 20) {
      const batch = chunkRows.slice(i, i + 20);
      const { error: chunkError } = await supabase
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
