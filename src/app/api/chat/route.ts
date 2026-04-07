import { NextRequest } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";
import { generateEmbedding, streamChat } from "@/lib/gemini";

export const maxDuration = 30;

const SYSTEM_PROMPT = `You are an expert technical analyst and research assistant for the Multimodal Open-Science & Patent Interrogator system. 

Your role:
- Analyze scientific papers, patents, and technical documents
- Explain complex diagrams, charts, and technical figures when referenced
- Provide precise, well-structured answers grounded in the retrieved context
- If the context doesn't contain enough information, say so honestly
- Use markdown formatting for clarity (headers, lists, code blocks, bold text)
- Reference specific chunks or diagrams when relevant

Always base your answers on the provided context. If diagrams are referenced, describe what they show based on the surrounding text context.`;

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

    // 2. Perform similarity search via RPC
    const { data: chunks, error: searchError } = await supabase.rpc(
      "match_document_chunks",
      {
        query_embedding: JSON.stringify(queryEmbedding),
        match_threshold: 0.3,
        match_count: 5,
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

    const contextChunks = (chunks || []).map(
      (c: { text_content: string; image_url: string | null }) => ({
        text: c.text_content,
        imageUrl: c.image_url || undefined,
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

    // 4. Stream response from Gemini
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
              .filter((c: { imageUrl?: string }) => c.imageUrl)
              .map((c: { imageUrl?: string }) => c.imageUrl),
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
