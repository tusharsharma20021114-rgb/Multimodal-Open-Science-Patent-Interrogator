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
  const genAI = getClient();
  const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

/**
 * Generate embeddings for multiple texts in sequence.
 * Gemini free tier has rate limits, so we process sequentially with small delays.
 */
export async function generateEmbeddings(
  texts: string[]
): Promise<number[][]> {
  const embeddings: number[][] = [];
  for (let i = 0; i < texts.length; i++) {
    const embedding = await generateEmbedding(texts[i]);
    embeddings.push(embedding);
    // Small delay to respect free tier rate limits (15 RPM)
    if (i < texts.length - 1 && (i + 1) % 10 === 0) {
      await new Promise((r) => setTimeout(r, 1000));
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
    model: "gemini-1.5-flash",
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
