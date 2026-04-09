import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase";
import { searchDocuments } from "@/lib/rag";
import { streamChat } from "@/lib/gemini";
import { chatSchema } from "@/lib/validations";
import type { ContextChunk } from "@/types";

const SYSTEM_PROMPT = `You are an expert technical analyst and research assistant for the Multimodal Open-Science & Patent Interrogator system.

## Your Core Mission
You provide **comprehensive, detailed and thorough** answers grounded entirely in the retrieved document context. Your answers should be as detailed as a graduate-level textbook explanation.

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

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, documentId } = chatSchema.parse(body);

    const supabaseClient = await createClient();
    const serviceSupabase = createServiceClient();

    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;

    const contextChunks = await searchDocuments(
      query,
      userId,
      serviceSupabase,
      documentId ?? undefined
    );

    if (contextChunks.length === 0) {
      await serviceSupabase.from("query_logs").insert({
        user_id: userId,
        query,
        chunks_retrieved: 0,
        document_id: documentId || null,
      });

      const noContextMsg = documentId
        ? "I couldn't find any relevant content in this document for your query. Please try re-uploading the document or selecting 'All documents'."
        : "I couldn't find any relevant content across your documents. Please make sure you've uploaded documents first.";

      return new Response(noContextMsg, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache",
        },
      });
    }

    await serviceSupabase.from("query_logs").insert({
      user_id: userId,
      query,
      chunks_retrieved: contextChunks.length,
      document_id: documentId || null,
    });

    const stream = await streamChat(SYSTEM_PROMPT, query, contextChunks);

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
          const metadata = JSON.stringify({
            _meta: true,
            chunksUsed: contextChunks.length,
            images: contextChunks
              .filter((c: ContextChunk) => c.imageUrl)
              .map((c: ContextChunk) => c.imageUrl),
          });
          controller.enqueue(encoder.encode(`\n<!--META:${metadata}-->`));
          controller.close();
        } catch (err) {
          console.error("Stream error:", err);
          controller.enqueue(
            encoder.encode("\n\n*Error generating response.*")
          );
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
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    console.error("Chat error:", error);
    const details = error instanceof Error ? error.stack || error.message : String(error);
    return NextResponse.json(
      { error: "Internal server error", details },
      { status: 500 }
    );
  }
}
