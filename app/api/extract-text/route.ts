/**
 * Server-side document text extraction API
 * Handles PDF and DOCX extraction using pdf-parse and mammoth
 */

import { NextRequest, NextResponse } from 'next/server';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

// Increase body size limit for file uploads
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
    ];
    
    const isAllowed = allowedTypes.includes(file.type) || 
      file.name.toLowerCase().match(/\.(pdf|docx|doc|txt)$/i) !== null;
    
    if (!isAllowed) {
      return NextResponse.json(
        { error: 'Unsupported file type. Please upload PDF, DOCX, or TXT files.' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let text = '';

    try {
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        // Extract text from PDF
        const data = await pdfParse(buffer);
        text = data.text;
      } else if (
        file.type.includes('officedocument') ||
        file.name.toLowerCase().endsWith('.docx') ||
        file.name.toLowerCase().endsWith('.doc')
      ) {
        // Extract text from DOCX/DOC
        const result = await mammoth.extractRawText({ buffer });
        text = result.value;
      } else {
        // Plain text - try UTF-8 decode
        text = buffer.toString('utf-8');
      }
    } catch (extractError) {
      console.error('Extraction error:', extractError);
      return NextResponse.json(
        { error: 'Failed to extract text from file' },
        { status: 500 }
      );
    }

    // Clean the extracted text
    text = cleanText(text);

    // Truncate if too long (15KB max for API calls)
    const maxLength = 15000;
    const truncated = text.length > maxLength;
    if (text.length > maxLength) {
      text = text.slice(0, maxLength) + '\n\n[Document truncated - showing first ' + maxLength + ' characters]';
    }

    return NextResponse.json({
      success: true,
      text,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      truncated,
      originalLength: text.length,
    });

  } catch (error) {
    console.error('Extract API error:', error);
    return NextResponse.json(
      { error: 'Failed to process file' },
      { status: 500 }
    );
  }
}

function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}
