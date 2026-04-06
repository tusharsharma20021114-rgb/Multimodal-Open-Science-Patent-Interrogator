/**
 * Split text into overlapping chunks for embedding.
 * Uses word boundaries to avoid splitting mid-word.
 */
export function chunkText(
  text: string,
  chunkSize: number = 500,
  overlap: number = 50
): string[] {
  const words = text.split(/\s+/).filter((w) => w.length > 0);

  if (words.length <= chunkSize) {
    return [words.join(" ")];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < words.length) {
    const end = Math.min(start + chunkSize, words.length);
    const chunk = words.slice(start, end).join(" ");

    if (chunk.trim().length > 0) {
      chunks.push(chunk.trim());
    }

    if (end >= words.length) break;
    start += chunkSize - overlap;
  }

  return chunks;
}
