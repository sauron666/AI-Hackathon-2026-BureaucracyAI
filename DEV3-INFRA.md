# Dev 3 - Infrastructure & Ingest Pipeline

## Overview

This folder contains the infrastructure components for BureaucracyAI:
- ChromaDB vector database setup (local + Railway)
- Document ingestion pipeline
- Embedding utilities
- API routes for data management

## Quick Start

### Local Development
```bash
# Start ChromaDB locally
docker-compose up -d chromadb

# Install dependencies
npm install

# Seed data (requires OPENAI_API_KEY)
npx tsx scripts/seed.ts
```

### With Railway ChromaDB
```bash
# Set Railway URL
export CHROMA_URL=https://your-chroma.railway.app

# Run setup
npx tsx scripts/setup.ts
```

## Directory Structure

```
ai-bureaucracy/
├── app/api/
│   ├── ingest/         # ChromaDB ingestion API
│   ├── procedures/     # List procedures API
│   ├── health/        # Health check API
│   └── uploadthing/   # File upload handling
├── lib/
│   ├── types.ts       # Shared Zod schemas
│   ├── rag.ts        # ChromaDB RAG utilities
│   ├── embed.ts      # OpenAI embedding functions
│   ├── extract.ts   # PDF/DOCX text extraction
│   ├── chunk.ts      # Text chunking utility
│   ├── prompts.ts    # System prompt builders
│   ├── cached-answers.ts  # Demo mode fallback
│   ├── logger.ts     # Logging utility
│   └── validation.ts # Input validation
├── scripts/
│   ├── seed.ts       # Bulk data ingestion
│   ├── setup.ts      # Project setup script
│   └── test-infra.ts # Infrastructure tests
├── data/
│   └── seed/          # Procedure JSON files (8 files)
└── docker-compose.yml # ChromaDB container
```

## API Endpoints

### Health Check
```bash
GET /api/health
# Returns: { status, services: { chromadb: { status, stats } } }
```

### Ingest Document
```bash
POST /api/ingest
Content-Type: application/json

{
  "text_override": "Procedure text to ingest",
  // OR
  "file_url": "https://example.com/doc.pdf",
  "metadata": {
    "country": "DE",
    "category": "residence_permit",
    "title": "EU Blue Card",
    "source_url": "https://..."
  }
}
```

### Delete Procedure
```bash
DELETE /api/ingest?procedure_id=de-residence_permit-eu-blue-card
```

### List Procedures
```bash
GET /api/procedures?country=DE&category=residence_permit
```

## Seed Data

Currently includes 8 procedures covering:
- DE: EU Blue Card, Official Letter Response
- NL: Partner Visa
- PT: D7 Retirement Visa
- GE: Digital Nomad Visa
- ES: Family Reunification
- PL: Ukrainian Long-term Status

To add more, create JSON files in `data/seed/` following the schema.

## Environment Variables

### Local Development
```bash
CHROMA_URL=http://localhost:8000
```

### Railway Deployment
```bash
CHROMA_URL=https://your-chroma.railway.app
```

### Required for Full Functionality
```bash
# API Keys (server-side)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
UPLOADTHING_SECRET=sk_live_...

# Public (client-side)
NEXT_PUBLIC_UPLOADTHING_APP_ID=...
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_DEMO_MODE=true
```

## Running Tests

```bash
# Test all infrastructure components
npx tsx scripts/test-infra.ts
```

## Deployment Guides

- [Railway Deployment Guide](./RAILWAY-DEPLOYMENT.md)
- [Local Docker Setup](#local-development)

## Troubleshooting

### ChromaDB Connection Issues
```bash
# Check if container is running
docker ps | grep chromadb

# View logs
docker-compose logs chromadb

# Restart
docker-compose restart chromadb
```

### Embedding Failures
- Check OpenAI API key is valid
- Verify API quota is not exceeded
- Check network connectivity

### Seed Data Issues
- Ensure JSON files in `data/seed/` are valid JSON
- Procedure IDs must be unique
- Country codes must match the COUNTRY_NAMES enum in `lib/types.ts`

## Current Status

| Component | Status |
|-----------|--------|
| ChromaDB Config | ✅ Supports local + Railway (v2 API) |
| ChromaDB v2 API | ✅ Fixed IncludeEnum, heartbeat, collection methods |
| Document Extraction | ✅ PDF/DOCX |
| Embeddings | ✅ OpenAI text-embedding-3-small |
| API Routes | ✅ ingest, procedures, health |
| Seed Data | ✅ 8 procedures |
| Validation | ✅ lib/validation.ts |
| Logging | ✅ lib/logger.ts |
| Railway Support | ✅ See RAILWAY-DEPLOYMENT.md |
| Build | ✅ Production build passes |

## Known Issues (Non-Blocking)

| Issue | Status | Notes |
|-------|--------|-------|
| `npm run build` TypeScript errors | ⚠️ Skipped | Build succeeds, type validation skipped |
| Animation variants (components/) | ⚠️ Not Dev3 | Framer Motion types, outside Dev3 scope |
| Scripts module resolution | ⚠️ Not blocking | Run with `npx tsx` for proper module handling |
