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
 * Stream a multimodal chat response from Gemini 1.5 Flash (free tier).
 */
export async function streamChat(
  systemPrompt: string,
  userMessage: string,
  contextChunks: { text: string; imageUrl?: string }[]
) {
  const genAI = getClient();
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: systemPrompt,
  });

  // Build the content parts
  const parts: { text: string }[] = [];

  // Add context chunks
  if (contextChunks.length > 0) {
    let contextText = "## Retrieved Context:\n\n";
    contextChunks.forEach((chunk, i) => {
      contextText += `### Chunk ${i + 1}:\n${chunk.text}\n`;
      if (chunk.imageUrl) {
        contextText += `[Associated Diagram: ${chunk.imageUrl}]\n`;
      }
      contextText += "\n";
    });
    parts.push({ text: contextText });
  }

  parts.push({ text: `## User Query:\n${userMessage}` });

  const result = await model.generateContentStream({ contents: [{ role: "user", parts }] });
  return result.stream;
}
