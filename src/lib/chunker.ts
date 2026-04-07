/**
 * Smart, math-aware text chunking for RAG.
 *
 * Key improvements over naive word-split:
 * 1. Section-aware: prefers splitting at section/heading boundaries
 * 2. Math-preserving: never splits inside LaTeX blocks ($$...$$, \begin{}...\end{})
 * 3. Figure-caption grouping: keeps "Figure X: ..." captions with surrounding text
 * 4. Larger default chunk size (1000 words) with generous overlap (200 words)
 */

// Regex patterns for structural elements
const SECTION_HEADING_RE =
  /^(?:\d+\.?\s+[A-Z]|#{1,3}\s|Abstract|Introduction|Conclusion|References|Related Work|Methodology|Results|Discussion|Appendix|Acknowledgment)/m;

const MATH_BLOCK_RE =
  /\$\$[\s\S]*?\$\$|\\begin\{(?:equation|align|gather|multline|array|matrix|cases)\*?\}[\s\S]*?\\end\{(?:equation|align|gather|multline|array|matrix|cases)\*?\}/g;

const FIGURE_CAPTION_RE =
  /(?:Fig(?:ure)?\.?\s*\d+|TABLE\s+[IVX\d]+)[.:]\s*[^\n]+/gi;

/**
 * Identify "protected" ranges in the text that should never be split.
 * Returns an array of [start, end] character indices.
 */
function getProtectedRanges(text: string): [number, number][] {
  const ranges: [number, number][] = [];

  // Protect math blocks
  let match;
  const mathRe = new RegExp(MATH_BLOCK_RE.source, "g");
  while ((match = mathRe.exec(text)) !== null) {
    ranges.push([match.index, match.index + match[0].length]);
  }

  // Protect figure captions (keep entire line)
  const figRe = new RegExp(FIGURE_CAPTION_RE.source, "gi");
  while ((match = figRe.exec(text)) !== null) {
    ranges.push([match.index, match.index + match[0].length]);
  }

  return ranges;
}

/**
 * Check if a character position falls inside a protected range.
 */
function isProtected(pos: number, ranges: [number, number][]): boolean {
  return ranges.some(([start, end]) => pos >= start && pos < end);
}

/**
 * Find the best split point near `targetPos` in the text.
 * Priority: section heading > paragraph break > sentence end > word boundary
 * Never splits inside a protected range.
 */
function findBestSplitPoint(
  text: string,
  targetPos: number,
  protectedRanges: [number, number][],
  searchWindow: number = 500
): number {
  const searchStart = Math.max(0, targetPos - searchWindow);
  const searchEnd = Math.min(text.length, targetPos + searchWindow);
  const searchRegion = text.substring(searchStart, searchEnd);

  // 1. Try to find a section heading boundary
  const headingRe = new RegExp(SECTION_HEADING_RE.source, "gm");
  let bestHeading = -1;
  let bestHeadingDist = Infinity;
  let m;
  while ((m = headingRe.exec(searchRegion)) !== null) {
    const absPos = searchStart + m.index;
    // Split just before the heading
    const lineStart = text.lastIndexOf("\n", absPos - 1);
    const splitAt = lineStart > 0 ? lineStart : absPos;
    const dist = Math.abs(splitAt - targetPos);
    if (dist < bestHeadingDist && !isProtected(splitAt, protectedRanges)) {
      bestHeading = splitAt;
      bestHeadingDist = dist;
    }
  }
  if (bestHeading >= 0 && bestHeadingDist < searchWindow) {
    return bestHeading;
  }

  // 2. Try a paragraph break (double newline)
  let bestPara = -1;
  let bestParaDist = Infinity;
  const paraRe = /\n\s*\n/g;
  while ((m = paraRe.exec(searchRegion)) !== null) {
    const absPos = searchStart + m.index + m[0].length;
    const dist = Math.abs(absPos - targetPos);
    if (dist < bestParaDist && !isProtected(absPos, protectedRanges)) {
      bestPara = absPos;
      bestParaDist = dist;
    }
  }
  if (bestPara >= 0 && bestParaDist < searchWindow) {
    return bestPara;
  }

  // 3. Try sentence end (. ! ? followed by space or newline)
  let bestSentence = -1;
  let bestSentenceDist = Infinity;
  const sentRe = /[.!?]\s+/g;
  while ((m = sentRe.exec(searchRegion)) !== null) {
    const absPos = searchStart + m.index + m[0].length;
    const dist = Math.abs(absPos - targetPos);
    if (dist < bestSentenceDist && !isProtected(absPos, protectedRanges)) {
      bestSentence = absPos;
      bestSentenceDist = dist;
    }
  }
  if (bestSentence >= 0) {
    return bestSentence;
  }

  // 4. Fall back to word boundary
  const spaceIdx = text.indexOf(" ", targetPos);
  if (spaceIdx >= 0 && !isProtected(spaceIdx, protectedRanges)) {
    return spaceIdx + 1;
  }

  return targetPos;
}

/**
 * Estimate word count in a text segment.
 */
function wordCount(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}

/**
 * Split text into overlapping, structure-aware chunks.
 *
 * @param text - Full document text
 * @param chunkSizeWords - Target chunk size in words (default: 1000)
 * @param overlapWords - Overlap between chunks in words (default: 200)
 * @returns Array of text chunks
 */
export function chunkText(
  text: string,
  chunkSizeWords: number = 1000,
  overlapWords: number = 200
): string[] {
  // Clean up the text but preserve structure
  const cleanedText = text
    .replace(/\r\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n") // collapse excessive newlines
    .trim();

  const totalWords = wordCount(cleanedText);

  // If text is small enough, return as single chunk
  if (totalWords <= chunkSizeWords + overlapWords) {
    return [cleanedText];
  }

  const protectedRanges = getProtectedRanges(cleanedText);
  const chunks: string[] = [];

  // Estimate average chars per word for position calculation
  const avgCharsPerWord = cleanedText.length / totalWords;
  const chunkSizeChars = Math.round(chunkSizeWords * avgCharsPerWord);
  const overlapChars = Math.round(overlapWords * avgCharsPerWord);

  let pos = 0;

  while (pos < cleanedText.length) {
    const targetEnd = pos + chunkSizeChars;

    // If we're near the end, just take the rest
    if (targetEnd >= cleanedText.length - overlapChars) {
      const chunk = cleanedText.substring(pos).trim();
      if (chunk.length > 0) {
        chunks.push(chunk);
      }
      break;
    }

    // Find the best place to cut
    const splitAt = findBestSplitPoint(
      cleanedText,
      targetEnd,
      protectedRanges
    );

    const chunk = cleanedText.substring(pos, splitAt).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    // Move position forward, accounting for overlap
    const nextStart = splitAt - overlapChars;
    pos = Math.max(pos + 1, nextStart); // Always advance at least 1 char
  }

  return chunks;
}
