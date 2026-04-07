import { NextRequest } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { generateEmbedding, streamChat } from "@/lib/gemini";
import type { ContextChunk } from "@/lib/gemini";

export const maxDuration = 30;

const SYSTEM_PROMPT = `You are an expert technical analyst and research assistant for the Multimodal Open-Science & Patent Interrogator system.

## Your Core Mission
You provide **comprehensive, detailed, and thorough** answers grounded entirely in the retrieved document context. Your answers should be as detailed as a graduate-level textbook explanation.

## Response Guidelines

### Length & Depth
- Provide **multi-paragraph, in-depth** answers — minimum 300-500 words for substantive questions
- Never give one-line or bullet-point-only answers for technical questions
- If the user asks about a concept, explain it thoroughly: definition → intuition → mathematical formulation → practical implications
- Include relevant background and connections between concepts when present in the context

### Mathematical Content
- When mathematical formulas or equations appear in the context, **explain them step-by-step**:
  1. State the formula clearly using LaTeX notation ($$...$$ for display math, $...$ for inline)
  2. Define every variable and symbol
  3. Explain the intuition behind the formula — what does it compute and why?
  4. Describe how it fits into the broader method/algorithm
- Do NOT skip over equations — they are critical to understanding the research

### Diagrams & Figures
- When figures, tables, or diagrams are referenced in the context, **describe them in thorough detail**:
  - What type of visualization is it? (architecture diagram, flowchart, bar chart, table, etc.)
  - What are the components, nodes, layers, or elements shown?
  - What are the connections, arrows, or data flows?
  - What does the figure demonstrate or prove?
  - Reference the figure number (e.g., "As shown in Figure 3...")
- Synthesize information from the surrounding text to give a complete picture of what the diagram shows

### Structure & Formatting
- Use rich markdown formatting: headers (##, ###), bold, lists, code blocks, tables
- Use LaTeX math blocks for equations
- Organize long answers with clear sections
- Reference specific chunk numbers when citing information (e.g., "[from Chunk 3]")

### Grounding & Honesty
- Base ALL answers on the provided context — never hallucinate
- If the context doesn't contain enough information, say so honestly and explain what information IS available
- If only partial information is available, provide what you can and note the gaps
- Distinguish between what the document states vs. your interpretation`;

export async function POST(request: NextRequest) {
  try {
    const { query, documentId } = await request.json();

    if (!query || typeof query !== "string") {
      return new Response(JSON.stringify({ error: "Query is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabase = getServiceSupabase();

    // 1. Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);

    // 2. Perform similarity search via RPC — retrieve MORE chunks for richer context
    const { data: chunks, error: searchError } = await supabase.rpc(
      "match_document_chunks",
      {
        query_embedding: JSON.stringify(queryEmbedding),
        match_threshold: 0.2,   // Lowered from 0.3 to capture more marginally relevant chunks
        match_count: 15,        // Increased from 5 to 15 for much richer context
        filter_document_id: documentId || null,
      }
    );

    if (searchError) {
      console.error("Search error:", searchError);
      return new Response(
        JSON.stringify({ error: "Failed to search documents" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Build context chunks with similarity scores and chunk indices
    const contextChunks: ContextChunk[] = (chunks || []).map(
      (c: {
        text_content: string;
        image_url: string | null;
        similarity: number;
        chunk_index: number;
      }) => ({
        text: c.text_content,
        imageUrl: c.image_url || undefined,
        similarity: c.similarity,
        chunkIndex: c.chunk_index,
      })
    );

    // If no chunks found, return a helpful message instead of hallucinating
    if (contextChunks.length === 0) {
      await supabase.from("query_logs").insert({
        query,
        chunks_retrieved: 0,
        document_id: documentId || null,
      });

      const noContextMsg = documentId
        ? "I couldn't find any relevant content in this document for your query. This may happen if the document hasn't been fully processed yet. Please try re-uploading the document or selecting 'All documents'."
        : "I couldn't find any relevant content across your documents for this query. Please make sure you've uploaded documents first.";

      return new Response(noContextMsg, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache",
        },
      });
    }

    // 3. Log query for analytics
    await supabase.from("query_logs").insert({
      query,
      chunks_retrieved: contextChunks.length,
      document_id: documentId || null,
    });

    // 4. Stream response from Gemini with enriched context
    const stream = await streamChat(SYSTEM_PROMPT, query, contextChunks);

    // Convert to ReadableStream for the response
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.text();
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
          // Send metadata at the end
          const metadata = JSON.stringify({
            _meta: true,
            chunksUsed: contextChunks.length,
            images: contextChunks
              .filter((c) => c.imageUrl)
              .map((c) => c.imageUrl),
          });
          controller.enqueue(encoder.encode(`\n<!--META:${metadata}-->`));
          controller.close();
        } catch (err) {
          console.error("Stream error:", err);
          controller.enqueue(encoder.encode("\n\n*Error generating response.*"));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
