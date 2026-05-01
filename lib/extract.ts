import mammoth from 'mammoth';

/**
 * Extract text from PDF or DOCX files by URL
 * Uses dynamic imports to avoid Next.js build issues with pdf-parse
 */
export async function extractTextFromUrl(fileUrl: string): Promise<string> {
  const res = await fetch(fileUrl);
  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get('content-type') || '';
  const url = fileUrl.toLowerCase();

  try {
    if (contentType.includes('pdf') || url.endsWith('.pdf')) {
      const pdfParse = (await import('pdf-parse')).default;
      const data = await pdfParse(buffer);
      return cleanText(data.text);
    }
    if (contentType.includes('officedocument') || url.endsWith('.docx') || url.endsWith('.doc')) {
      const result = await mammoth.extractRawText({ buffer });
      return cleanText(result.value);
    }
    // Fallback: plain text
    return cleanText(buffer.toString('utf-8'));
  } catch (err) {
    // Final fallback: try to decode as UTF-8
    return cleanText(buffer.toString('utf-8'));
  }
}

/**
 * Clean extracted text by normalizing whitespace
 */
function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}
