import { generateEmbedding } from "./gemini";
import { hashString } from "./utils";
import { createServiceClient } from "./supabase";
import type { ContextChunk } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const EMBEDDING_BATCH_SIZE = 10;
const EMBEDDING_DELAY_MS = 500;

async function getCachedEmbedding(
  text: string,
  supabase: SupabaseClient
) {
  const contentHash = hashString(text);
  
  const { data } = await supabase
    .from("embedding_cache")
    .select("embedding")
    .eq("content_hash", contentHash)
    .single();
  
  if (data?.embedding) {
    return data.embedding;
  }
  return null;
}

async function cacheEmbedding(
  text: string,
  embedding: number[],
  userId: string,
  supabase: SupabaseClient
) {
  const contentHash = hashString(text);
  
  await supabase.from("embedding_cache").upsert({
    content_hash: contentHash,
    user_id: userId,
    content: text,
    embedding: JSON.stringify(embedding),
  });
}

export async function generateEmbeddingCached(
  text: string,
  userId: string,
  supabase: SupabaseClient
): Promise<number[]> {
  const cached = await getCachedEmbedding(text, supabase);
  if (cached) {
    return cached;
  }

  const embedding = await generateEmbedding(text);
  await cacheEmbedding(text, embedding, userId, supabase);
  return embedding;
}

export async function generateEmbeddingsBatched(
  texts: string[],
  userId: string,
  supabase: SupabaseClient,
  onProgress?: (current: number, total: number) => void
): Promise<number[][]> {
  const embeddings: number[][] = [];
  const uncachedTexts: { text: string; index: number }[] = [];
  const cacheMap = new Map<number, number[]>();

  for (let i = 0; i < texts.length; i++) {
    const cached = await getCachedEmbedding(texts[i], supabase);
    if (cached) {
      cacheMap.set(i, cached);
    } else {
      uncachedTexts.push({ text: texts[i], index: i });
    }
  }

  for (let i = 0; i < texts.length; i++) {
    if (cacheMap.has(i)) {
      embeddings[i] = cacheMap.get(i)!;
    }
  }

  for (let i = 0; i < uncachedTexts.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = uncachedTexts.slice(i, i + EMBEDDING_BATCH_SIZE);
    
    const results = await Promise.all(
      batch.map(({ text }) => generateEmbedding(text))
    );

    for (let j = 0; j < batch.length; j++) {
      const { index } = batch[j];
      embeddings[index] = results[j];
      
      await cacheEmbedding(texts[index], results[j], userId, supabase);
    }

    if (onProgress) {
      const cachedCount = cacheMap.size;
      const processedCount = cachedCount + Math.min(i + EMBEDDING_BATCH_SIZE, uncachedTexts.length);
      onProgress(processedCount, texts.length);
    }

    if (i + EMBEDDING_BATCH_SIZE < uncachedTexts.length) {
      await new Promise((r) => setTimeout(r, EMBEDDING_DELAY_MS));
    }
  }

  return embeddings;
}

export async function searchDocuments(
  query: string,
  userId: string,
  supabase: SupabaseClient,
  documentId?: string
): Promise<ContextChunk[]> {
  const queryEmbedding = await generateEmbeddingCached(query, userId, supabase);

  const { data: chunks, error } = await supabase.rpc("match_document_chunks", {
    query_embedding: queryEmbedding,
    match_threshold: 0.2,
    match_count: 15,
    filter_document_id: documentId || null,
    p_user_id: userId,
  });

  if (error) {
    console.error("Search error:", error);
    throw new Error("Failed to search documents");
  }

  return (chunks || []).map(
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
}

export async function explainDiagram(
  imageUrl: string,
  question: string,
  additionalContext?: string
): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const prompt = `You are an expert at analyzing and explaining technical diagrams, figures, and visualizations.

${additionalContext ? `Additional context from the document:\n${additionalContext}\n` : ""}
The user is asking about this diagram: ${imageUrl}

User's question: ${question}

Please provide a detailed, educational explanation of the diagram in relation to the question. Include:
- What the diagram shows
- Key components or elements
- How they relate to each other
- Any labels, axes, or data shown
- What insights can be drawn from this visualization`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 4096,
          temperature: 0.3,
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error: ${err}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "No explanation generated";
}

export async function explainMultipleDiagrams(
  imageUrls: string[],
  question: string,
  documentContext?: string
): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const diagramsText = imageUrls
    .map((url, i) => `Diagram ${i + 1}: ${url}`)
    .join("\n");

  const prompt = `You are an expert at analyzing and explaining technical diagrams, figures, and visualizations.

${documentContext ? `Document context:\n${documentContext}\n` : ""}
You have access to multiple diagrams:
${diagramsText}

User's question: ${question}

Please analyze ALL diagrams together and provide a comprehensive explanation that:
1. Describes each diagram individually
2. Explains how the diagrams relate to each other
3. Synthesizes the information across diagrams
4. Answers the user's question using all available visual information

Be thorough and educational in your explanation.`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 8192,
          temperature: 0.3,
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error: ${err}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "No explanation generated";
}
