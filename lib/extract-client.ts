"use client"

/**
 * Client-side PDF/DOCX text extraction
 * Uses pdf-parse and mammoth for browser-side file reading
 */

type PdfParseFn = (buffer: Buffer) => Promise<{ text: string }>;

let pdfParseModule: { default?: PdfParseFn } | PdfParseFn | null = null;
let mammothModule: typeof import('mammoth') | null = null;

// Dynamic import for pdf-parse (server-side safe, but browser needs dynamic import)
async function getPdfParse() {
  if (typeof window === 'undefined') {
    // Server-side - use regular import
    const mod = await import('pdf-parse');
    return mod.default as PdfParseFn;
  }
  if (!pdfParseModule) {
    pdfParseModule = await import('pdf-parse');
  }
  return (typeof pdfParseModule === 'function' ? pdfParseModule : pdfParseModule.default) as PdfParseFn;
}

// Dynamic import for mammoth
async function getMammoth() {
  if (typeof window === 'undefined') {
    const mod = await import('mammoth');
    return mod;
  }
  if (!mammothModule) {
    mammothModule = await import('mammoth');
  }
  return mammothModule;
}

/**
 * Extract text from a File object (browser-side)
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  try {
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      const pdfParse = await getPdfParse();
      const data = await pdfParse(buffer);
      return cleanText(data.text);
    }
    
    if (
      file.type.includes('officedocument') ||
      file.name.toLowerCase().endsWith('.docx') ||
      file.name.toLowerCase().endsWith('.doc')
    ) {
      const mammoth = await getMammoth();
      const result = await mammoth.extractRawText({ buffer });
      return cleanText(result.value);
    }
    
    // Fallback: plain text or attempt UTF-8 decode
    return cleanText(buffer.toString('utf-8'));
  } catch (err) {
    console.error('Extract error:', err);
    // Try raw text as last resort
    return cleanText(buffer.toString('utf-8'));
  }
}

/**
 * Clean extracted text by normalizing whitespace
 */
function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/**
 * Check if a file is a supported document type
 */
export function isSupportedDocument(file: File): boolean {
  const supportedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'text/plain',
  ];
  return supportedTypes.includes(file.type) || 
    file.name.toLowerCase().match(/\.(pdf|docx|doc|txt|png|jpg|jpeg)$/i) !== null;
}

/**
 * Get human-readable file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Truncate text to a maximum length for API calls
 */
export function truncateText(text: string, maxLength = 15000): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '\n\n[Document truncated - showing first ' + maxLength + ' characters]';
}
