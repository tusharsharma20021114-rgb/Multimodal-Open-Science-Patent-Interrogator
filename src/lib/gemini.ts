import { GoogleGenerativeAI } from "@google/generative-ai";

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  return new GoogleGenerativeAI(apiKey);
}

/**
 * Generate embedding for a single text using Gemini's free embedding model.
 * Returns a 768-dimensional vector.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  // Retry with exponential backoff for rate limits
  for (let attempt = 0; attempt < 5; attempt++) {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: { parts: [{ text }] },
          outputDimensionality: 768,
        }),
      }
    );

    if (resp.ok) {
      const data = await resp.json();
      return data.embedding.values;
    }

    if (resp.status === 429 && attempt < 4) {
      const waitMs = Math.pow(2, attempt) * 2000 + Math.random() * 1000;
      console.log(`Rate limited, retrying in ${(waitMs / 1000).toFixed(1)}s...`);
      await new Promise((r) => setTimeout(r, waitMs));
      continue;
    }

    const err = await resp.text();
    throw new Error(`Embedding API error: ${resp.status} - ${err}`);
  }

  throw new Error("Embedding failed after 5 retries");
}

/**
 * Generate embeddings for multiple texts in sequence.
 * Aggressive rate limiting for free tier (1500 RPM for embeddings).
 */
export async function generateEmbeddings(
  texts: string[]
): Promise<number[][]> {
  const embeddings: number[][] = [];
  for (let i = 0; i < texts.length; i++) {
    const embedding = await generateEmbedding(texts[i]);
    embeddings.push(embedding);
    // Delay between each call to stay within rate limits
    if (i < texts.length - 1) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  return embeddings;
}

/**
 * Context chunk with similarity score for richer LLM context.
 */
export interface ContextChunk {
  text: string;
  imageUrl?: string;
  similarity?: number;
  chunkIndex?: number;
}

/**
 * Stream a multimodal chat response from Gemini 2.5 Flash (free tier).
 * Includes retry logic for rate limits.
 *
 * Key improvements:
 * - Structured context with similarity scores and chunk indices
 * - Generation config with high maxOutputTokens for detailed answers
 * - Temperature tuned for factual, comprehensive responses
 */
export async function streamChat(
  systemPrompt: string,
  userMessage: string,
  contextChunks: ContextChunk[]
) {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: systemPrompt,
    generationConfig: {
      maxOutputTokens: 8192,
      temperature: 0.3,
    },
  });

  // Build the content parts
  const parts: { text: string }[] = [];

  // Add context chunks with structured formatting
  if (contextChunks.length > 0) {
    let contextText = "## Retrieved Document Context\n\n";
    contextText +=
      `The following ${contextChunks.length} chunks were retrieved from the uploaded documents, ` +
      `ordered by relevance (highest similarity first). Use ALL of this context to construct ` +
      `your answer. Pay special attention to mathematical formulas, equations, and diagram descriptions.\n\n`;

    // Sort by similarity (highest first) for better context presentation
    const sorted = [...contextChunks].sort(
      (a, b) => (b.similarity ?? 0) - (a.similarity ?? 0)
    );

    sorted.forEach((chunk, i) => {
      const simLabel = chunk.similarity
        ? ` (relevance: ${(chunk.similarity * 100).toFixed(1)}%)`
        : "";
      const idxLabel =
        chunk.chunkIndex !== undefined
          ? ` [Document Chunk #${chunk.chunkIndex}]`
          : "";

      contextText += `### Context Chunk ${i + 1}${simLabel}${idxLabel}\n\n`;
      contextText += `${chunk.text}\n\n`;

      if (chunk.imageUrl) {
        contextText += `📊 **Associated Diagram/Figure**: ${chunk.imageUrl}\n`;
        contextText +=
          `(Describe this diagram in detail based on the surrounding text context — ` +
          `explain its components, axes, labels, data flow, and what it demonstrates.)\n\n`;
      }

      contextText += "---\n\n";
    });

    parts.push({ text: contextText });
  }

  parts.push({
    text: `## User Question\n\n${userMessage}\n\n` +
      `**Remember**: Provide a comprehensive, detailed answer using the context above. ` +
      `Explain any mathematical formulas step-by-step. Describe any referenced diagrams thoroughly.`,
  });

  // Retry with exponential backoff for rate limits
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const result = await model.generateContentStream({
        contents: [{ role: "user", parts }],
      });
      return result.stream;
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : String(err);
      if (errorMessage.includes("429") && attempt < 3) {
        const waitMs = Math.pow(2, attempt) * 3000 + Math.random() * 2000;
        console.log(
          `Chat rate limited, retrying in ${(waitMs / 1000).toFixed(1)}s...`
        );
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
      throw err;
    }
  }

  throw new Error("Chat failed after 4 retries");
}
