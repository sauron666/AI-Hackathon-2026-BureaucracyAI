/**
 * Split text into overlapping chunks for embedding
 * Uses word-based splitting to preserve sentence boundaries
 */
export function chunkText(text: string, size = 400, overlap = 50): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  let start = 0;

  while (start < words.length) {
    const end = Math.min(start + size, words.length);
    const chunk = words.slice(start, end).join(' ');
    if (chunk.length > 80) chunks.push(chunk);
    if (end >= words.length) break;
    start += size - overlap;
  }

  return chunks;
}
