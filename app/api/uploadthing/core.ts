import { createUploadthing, type FileRouter } from 'uploadthing/next';
import { z } from 'zod';

const f = createUploadthing();

/**
 * UploadThing router for document uploads
 * Handles both document analysis and knowledge base ingestion
 */
export const ourFileRouter = {
  documentUploader: f({
    pdf: { maxFileSize: '16MB', maxFileCount: 1 },
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
      maxFileSize: '8MB', maxFileCount: 1,
    },
  })
    .input(z.object({
      country: z.string().default('DE'),
      mode: z.enum(['analyze', 'ingest']).default('analyze'),
      document_type: z.string().default('contract'),
    }))
    .middleware(async ({ input }) => ({ meta: input }))
    .onUploadComplete(async ({ file, metadata }) => {
      if (metadata.meta.mode === 'ingest') {
        // Fire-and-forget: add to knowledge base
        fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ingest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file_url: file.url,
            metadata: {
              country: metadata.meta.country,
              category: 'user_upload',
              source_url: file.url,
              language: 'en',
              procedure_id: `upload-${file.key}`,
            },
          }),
        });
      }
      return {
        url: file.url,
        mode: metadata.meta.mode,
        document_type: metadata.meta.document_type,
        country: metadata.meta.country,
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
