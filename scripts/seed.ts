/**
 * Seed Script - Bulk ingest procedure data from JSON files into ChromaDB
 *
 * Usage: npx tsx scripts/seed.ts
 *
 * Requires:
 * - ChromaDB running (docker-compose up -d chromadb)
 * - Embedding API key set (SIRMA_API_KEY preferred, or OPENAI_API_KEY fallback)
 * - Procedure JSON files in data/seed/
 */

import { readdir, readFile } from 'fs/promises';
import path from 'path';
import { ChromaClient, IncludeEnum } from 'chromadb';

// Import chunk and embed functions from lib
import { chunkText } from '../lib/chunk';
import { embedBatch } from '../lib/embed';

const chroma = new ChromaClient({ path: process.env.CHROMA_URL || 'http://localhost:8000' });

async function seedProcedures() {
  console.log('\n🔄 Starting seed process...\n');

  const collection = await chroma.getOrCreateCollection({
    name: 'procedures',
    metadata: { 'hnsw:space': 'cosine' },
  });

  const seedDir = path.join(process.cwd(), 'data', 'seed');
  
  let files: string[];
  try {
    files = (await readdir(seedDir)).filter(f => f.endsWith('.json'));
  } catch (err) {
    console.error(`❌ Failed to read seed directory: ${(err as Error).message}`);
    console.log('   Make sure the data/seed directory exists');
    process.exit(1);
  }

  if (files.length === 0) {
    console.warn('⚠️  No JSON files found in data/seed/');
    console.log('   Add procedure JSON files to data/seed/ to seed data');
    return;
  }

  console.log(`📁 Found ${files.length} procedure files to seed...\n`);

  let successCount = 0;
  let failCount = 0;

  for (const file of files) {
    try {
      const filePath = path.join(seedDir, file);
      const p = JSON.parse(await readFile(filePath, 'utf-8'));

      // Validate required fields
      if (!p.procedure_id || !p.title || !p.country || !p.category) {
        console.warn(`⚠️  Skipping ${file} - missing required fields`);
        failCount++;
        continue;
      }

      // Build full text for chunking
      const fullText = [
        `Title: ${p.title}`,
        `Country: ${p.country}`,
        `Category: ${p.category}`,
        `Summary: ${p.summary || ''}`,
        `Steps:\n${(p.steps || []).map((s: string, i: number) => `${i + 1}. ${s}`).join('\n')}`,
        `Required documents:\n${(p.documents || []).map((d: string) => `- ${d}`).join('\n')}`,
        `Office: ${p.office || 'N/A'}`,
        `Fee: ${p.fee || 'N/A'}`,
        `Processing time: ${p.processing_days || 'N/A'} day(s)`,
        p.notes ? `Notes: ${p.notes}` : '',
      ].filter(Boolean).join('\n\n');

      // Chunk and embed
      const chunks = chunkText(fullText);
      
      if (chunks.length === 0) {
        console.warn(`⚠️  Skipping ${file} - no text to embed`);
        failCount++;
        continue;
      }

      const embeddings = await embedBatch(chunks);
      const ids = chunks.map((_, i) => `${p.procedure_id}-chunk-${i}`);
      const metadatas = chunks.map(() => ({
        country: p.country,
        category: p.category,
        source_url: p.source_url || '',
        language: p.language || 'en',
        procedure_id: p.procedure_id,
        title: p.title,
        difficulty: p.difficulty || 'moderate',
      }));

      // Upsert to ChromaDB
      await collection.upsert({ 
        ids, 
        documents: chunks, 
        embeddings, 
        metadatas 
      });
      
      console.log(`✓ ${p.procedure_id} (${chunks.length} chunks)`);
      successCount++;

      // Rate limit buffer for OpenAI (600ms between requests)
      await new Promise(r => setTimeout(r, 600));
    } catch (err) {
      console.error(`✗ Failed to seed ${file}: ${(err as Error).message}`);
      failCount++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`\n📊 Seed Results:`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   📁 Total: ${files.length}`);
  
  if (successCount > 0) {
    console.log('\n✅ Seed complete!');
  } else {
    console.log('\n❌ Seed failed - check errors above');
    process.exit(1);
  }
}

// Run if called directly
seedProcedures().catch(err => {
  console.error('❌ Seed script error:', err.message);
  process.exit(1);
});

export { seedProcedures };
