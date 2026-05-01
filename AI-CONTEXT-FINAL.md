# AI CODING CONTEXT — BureaucracyAI
# =========================================================
# INSTRUCTIONS FOR THE AI ASSISTANT READING THIS:
# This file is the complete specification for BureaucracyAI.
# The developer will tell you which feature/section they are working on.
# Your job: implement exactly what is specified here, using the exact
# types, function signatures, file paths, and patterns described.
# Do not invent new abstractions. Do not change the shared types.
# Ask which dev role they are (Dev 1/2/3/4) before starting.
# =========================================================

---

## PROJECT SUMMARY

BureaucracyAI: An AI-powered assistant that helps anyone navigate government bureaucracy
in any European country (and beyond). Two core use cases:
1. Ask a bureaucracy question → get structured step-by-step guidance
2. Upload a document (lease, contract, official letter) → get AI risk analysis

Additionally: full relocation journey planner and cross-country comparison.

Scope: 15+ countries, multilingual, expat-focused.
Stack: Next.js 14 App Router, Vercel AI SDK, Claude claude-sonnet-4-20250514, OpenAI embeddings, ChromaDB, UploadThing.
No Python. No separate backend. All logic is Next.js API routes.

---

## DIRECTORY STRUCTURE (exact paths — always use these)

```
/
├── app/
│   ├── page.tsx                         # Main page, mode switching
│   ├── layout.tsx                       # Root layout
│   └── api/
│       ├── chat/route.ts                # POST — streaming Q&A (Vercel AI SDK streamObject)
│       ├── analyze/route.ts             # POST — document risk analysis (generateObject)
│       ├── journey/route.ts             # POST — relocation roadmap (generateObject)
│       ├── compare/route.ts             # POST — country comparison (generateObject)
│       ├── ingest/route.ts              # POST — file/text → ChromaDB
│       ├── procedures/route.ts          # GET  — list procedures for browse mode
│       └── uploadthing/
│           ├── core.ts                  # UploadThing router definition
│           └── route.ts                 # UploadThing Next.js handler
├── components/
│   ├── ChatInterface.tsx                # Input + streaming answer display
│   ├── AnswerCard.tsx                   # Renders ProcedureAnswer (streaming-aware)
│   ├── DocumentAnalysisCard.tsx         # Renders DocumentRisk with severity badges
│   ├── UploadAnalyze.tsx                # Upload dropzone + triggers analysis
│   ├── JourneyPlanner.tsx               # Relocation journey UI
│   ├── CountryCompare.tsx               # Country comparison UI
│   ├── BrowseMode.tsx                   # Category cards → pre-fills chat
│   ├── SkeletonCard.tsx                 # Loading skeleton
│   └── ErrorBanner.tsx                  # Error state
├── lib/
│   ├── types.ts                         # ALL Zod schemas + TypeScript types (source of truth)
│   ├── rag.ts                           # ChromaDB query + context builder
│   ├── embed.ts                         # OpenAI embedding functions
│   ├── extract.ts                       # PDF + DOCX text extraction
│   ├── chunk.ts                         # Text chunking utility
│   ├── prompts.ts                       # System prompt builder functions
│   ├── uploadthing.ts                   # UploadThing client (generateComponents)
│   └── cached-answers.ts               # Pre-cached demo answers (fallback)
├── data/
│   └── seed/                            # JSON procedure files — committed to repo
│       └── *.json
├── scripts/
│   └── seed.ts                          # Bulk ingest: data/seed/ → ChromaDB
├── .env.local
├── docker-compose.yml
└── package.json
```

---

## ENVIRONMENT VARIABLES

```
# Server-side only (never NEXT_PUBLIC_)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
UPLOADTHING_SECRET=sk_live_...

# Exposed to browser
NEXT_PUBLIC_UPLOADTHING_APP_ID=...
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_DEMO_MODE=true

# ChromaDB
CHROMA_URL=http://localhost:8000
```

---

## SHARED TYPES — lib/types.ts
## NEVER redefine these elsewhere. Always import from '@/lib/types'.

```typescript
import { z } from 'zod';

export const ProcedureAnswerSchema = z.object({
  summary: z.string(),
  steps: z.array(z.string()),
  documents: z.array(z.string()),
  office: z.string().nullable(),
  fee_info: z.string().nullable(),
  source_url: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  answerable: z.boolean(),
});
export type ProcedureAnswer = z.infer<typeof ProcedureAnswerSchema>;

export const DocumentRiskSchema = z.object({
  risk_level: z.enum(['low', 'medium', 'high']),
  summary: z.string(),
  risks: z.array(z.object({
    clause: z.string(),
    risk: z.string(),
    severity: z.enum(['low', 'medium', 'high']),
    recommendation: z.string(),
  })),
  missing_clauses: z.array(z.string()),
  positive_points: z.array(z.string()),
  verdict: z.string(),
});
export type DocumentRisk = z.infer<typeof DocumentRiskSchema>;

export const RelocationJourneySchema = z.object({
  title: z.string(),
  phases: z.array(z.object({
    phase: z.string(),
    timeline: z.string(),
    tasks: z.array(z.object({
      task: z.string(),
      urgency: z.enum(['critical', 'important', 'optional']),
      where: z.string().nullable(),
      estimated_time: z.string().nullable(),
    })),
  })),
  warnings: z.array(z.string()),
  estimated_total_cost: z.string().nullable(),
});
export type RelocationJourney = z.infer<typeof RelocationJourneySchema>;

export const CountryComparisonSchema = z.object({
  question_interpreted: z.string(),
  countries: z.array(z.object({
    country_code: z.string(),
    country_name: z.string(),
    summary: z.string(),
    processing_time: z.string().nullable(),
    typical_cost: z.string().nullable(),
    difficulty: z.enum(['easy', 'moderate', 'complex']),
    key_advantage: z.string().nullable(),
    key_disadvantage: z.string().nullable(),
  })),
  recommendation: z.string(),
});
export type CountryComparison = z.infer<typeof CountryComparisonSchema>;

export const ProcedureSummarySchema = z.object({
  procedure_id: z.string(),
  title: z.string(),
  category: z.string(),
  country: z.string(),
  source_url: z.string(),
  difficulty: z.enum(['easy', 'moderate', 'complex']).optional(),
});
export type ProcedureSummary = z.infer<typeof ProcedureSummarySchema>;

export type Country = 'BG' | 'DE' | 'NL' | 'PT' | 'ES' | 'FR' | 'PL' | 'CZ'
  | 'AT' | 'SE' | 'HR' | 'GR' | 'RO' | 'GE' | 'RS' | 'GB' | 'CH' | 'UA';
export type Language = 'en' | 'bg' | 'de' | 'nl' | 'pt' | 'es' | 'fr' | 'tr';
export type AppMode = 'chat' | 'browse' | 'upload' | 'analyze' | 'journey' | 'compare';

export const COUNTRY_NAMES: Record<string, string> = {
  BG: 'Bulgaria', DE: 'Germany', NL: 'Netherlands', PT: 'Portugal',
  ES: 'Spain', FR: 'France', PL: 'Poland', CZ: 'Czech Republic',
  AT: 'Austria', SE: 'Sweden', HR: 'Croatia', GR: 'Greece',
  RO: 'Romania', GE: 'Georgia', RS: 'Serbia', GB: 'United Kingdom',
  CH: 'Switzerland', UA: 'Ukraine',
};

export const COUNTRY_FLAGS: Record<string, string> = {
  BG: '🇧🇬', DE: '🇩🇪', NL: '🇳🇱', PT: '🇵🇹', ES: '🇪🇸', FR: '🇫🇷',
  PL: '🇵🇱', CZ: '🇨🇿', AT: '🇦🇹', SE: '🇸🇪', HR: '🇭🇷', GR: '🇬🇷',
  RO: '🇷🇴', GE: '🇬🇪', RS: '🇷🇸', GB: '🇬🇧', CH: '🇨🇭', UA: '🇺🇦',
};
```

---

## PACKAGE.JSON DEPENDENCIES

```json
{
  "dependencies": {
    "next": "14.2.3",
    "react": "^18",
    "react-dom": "^18",
    "typescript": "^5",
    "ai": "^3.2.0",
    "@ai-sdk/anthropic": "^0.0.39",
    "@ai-sdk/openai": "^0.0.43",
    "openai": "^4.52.0",
    "chromadb": "^1.8.1",
    "zod": "^3.23.8",
    "pdf-parse": "^1.1.1",
    "mammoth": "^1.8.0",
    "uploadthing": "^6.12.0",
    "@uploadthing/react": "^6.7.0",
    "tailwindcss": "^3.4.0",
    "lucide-react": "^0.383.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.3.0"
  },
  "devDependencies": {
    "@types/pdf-parse": "^1.1.4",
    "@types/node": "^20",
    "@types/react": "^18",
    "tsx": "^4.15.0"
  }
}
```

---

## DEV 1 — DATA & RAG FILES

### lib/embed.ts

```typescript
import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function embedText(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text.slice(0, 8000),
  });
  return res.data[0].embedding;
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const res = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts.map(t => t.slice(0, 8000)),
  });
  return res.data.map(d => d.embedding);
}
```

### lib/chunk.ts

```typescript
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
```

### lib/rag.ts

```typescript
import { ChromaClient } from 'chromadb';
import { embedText } from './embed';

const chroma = new ChromaClient({ path: process.env.CHROMA_URL || 'http://localhost:8000' });

export async function retrieveContext(question: string, country: string, topK = 6) {
  const collection = await chroma.getOrCreateCollection({
    name: 'procedures',
    metadata: { 'hnsw:space': 'cosine' },
  });
  const embedding = await embedText(question);
  const results = await collection.query({
    queryEmbeddings: [embedding],
    nResults: topK,
    where: { country },
    include: ['documents', 'metadatas', 'distances'],
  });
  return {
    chunks: (results.documents[0] || []) as string[],
    sources: ((results.metadatas[0] || []) as any[]).map(m => m?.source_url || ''),
    distances: (results.distances?.[0] || []) as number[],
  };
}

export function buildContext(chunks: string[], sources: string[]): string {
  if (!chunks.length) return 'No relevant context found in the knowledge base.';
  return chunks.map((c, i) => `[Source: ${sources[i] || 'Unknown'}]\n${c}`).join('\n\n---\n\n');
}

export function getConfidence(distances: number[]): number {
  if (!distances.length) return 0;
  const best = 1 - Math.min(...distances);
  return Math.max(0, Math.min(1, best));
}
```

### scripts/seed.ts (run with: npx tsx scripts/seed.ts)

```typescript
import { readdir, readFile } from 'fs/promises';
import path from 'path';
import { ChromaClient } from 'chromadb';

// These imports work because the script runs from repo root
const { chunkText } = await import('../lib/chunk');
const { embedBatch } = await import('../lib/embed');

const chroma = new ChromaClient({ path: 'http://localhost:8000' });
const collection = await chroma.getOrCreateCollection({
  name: 'procedures',
  metadata: { 'hnsw:space': 'cosine' },
});

const seedDir = path.join(process.cwd(), 'data', 'seed');
const files = (await readdir(seedDir)).filter(f => f.endsWith('.json'));

for (const file of files) {
  const p = JSON.parse(await readFile(path.join(seedDir, file), 'utf-8'));
  const fullText = [
    `Title: ${p.title}`,
    `Country: ${p.country}`,
    `Category: ${p.category}`,
    `Summary: ${p.summary}`,
    `Steps:\n${p.steps.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n')}`,
    `Required documents:\n${p.documents.map((d: string) => `- ${d}`).join('\n')}`,
    `Office: ${p.office}`,
    `Fee: ${p.fee}`,
    `Processing time: ${p.processing_days} day(s)`,
    p.notes ? `Notes: ${p.notes}` : '',
  ].filter(Boolean).join('\n\n');

  const chunks = chunkText(fullText);
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

  await collection.upsert({ ids, documents: chunks, embeddings, metadatas });
  console.log(`✓ ${p.procedure_id} — ${chunks.length} chunks`);
  await new Promise(r => setTimeout(r, 600)); // OpenAI rate limit buffer
}

console.log(`\n✅ Seed complete. ${files.length} procedures ingested.`);
```

### Seed data JSON schema (all files in data/seed/)

```typescript
interface SeedProcedure {
  procedure_id: string;       // format: "{country_lower}-{category}-{descriptor}"
  country: string;            // "DE", "NL", "PT", "ES", "BG", "GE", etc.
  category: string;           // see CATEGORIES below
  title: string;              // English title
  title_local?: string;       // Local language title
  summary: string;            // 2-4 sentence overview, include context for who needs this
  steps: string[];            // Ordered, physically actionable steps
  documents: string[];        // Include local-language names in parentheses
  office: string;             // Full name, include local name
  fee: string;                // "Free" or "€110" or "Varies by municipality"
  processing_days: number;    // Typical business days
  notes?: string;             // Gotchas, exceptions, important context
  source_url: string;         // Official government URL — must be real
  difficulty: 'easy' | 'moderate' | 'complex';
  language: 'en';             // Seed data is always in English
  last_verified: string;      // "2025-01"
}

const CATEGORIES = [
  'address',           // Address registration
  'id_card',           // ID cards, passports
  'marriage',          // Marriage, civil partnerships
  'vehicle',           // Car registration, import
  'license',           // Driving licenses
  'residence_permit',  // Short and long-term residence
  'work_permit',       // Work authorization
  'business',          // Company registration
  'tax',               // Tax ID, registration, regimes
  'education',         // School, university, degree recognition
  'apostille',         // Document legalization
  'banking',           // Opening bank accounts
  'family',            // Family reunification
  'retirement',        // Pension, retirement visa
  'digital_nomad',     // Digital nomad visas
  'user_upload',       // User-uploaded documents
];
```

---

## DEV 2 — AI ROUTE FILES

### app/api/chat/route.ts

```typescript
import { streamObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { retrieveContext, buildContext, getConfidence } from '@/lib/rag';
import { ProcedureAnswerSchema, COUNTRY_NAMES } from '@/lib/types';

export const maxDuration = 30;

const LANG_NAMES: Record<string, string> = {
  en: 'English', de: 'German', nl: 'Dutch', pt: 'Portuguese',
  es: 'Spanish', fr: 'French', bg: 'Bulgarian', tr: 'Turkish',
};

function chatSystemPrompt(language: string, country: string): string {
  return `You are an expert bureaucracy navigator specializing in ${COUNTRY_NAMES[country] || country}.
You help expats, foreign nationals, and locals navigate official government procedures.
Your users are often stressed: moving abroad, language barriers, unsure of their legal rights.

RULES — never violate these:
1. Only use information from the provided context. Never invent procedures, document names, fees, or office names.
2. If context is insufficient: answerable=false, confidence below 0.4, summary states this clearly.
3. Every step must name the exact office, what to bring, and what to do there.
4. Always include the official local-language name of documents and offices in parentheses.
5. If any step requires speaking the local language, say so and suggest bringing a translator.
6. Fee: if free → 'Free (gratis)'. If unknown → null.
7. Confidence scale: 0.85-1.0 = complete answer | 0.5-0.85 = partial | below 0.5 = insufficient.
8. Respond entirely in ${LANG_NAMES[language] || 'English'}.

Output ONLY the JSON object. No preamble. No markdown fences.`;
}

export async function POST(req: Request) {
  const { question, language = 'en', country = 'DE' } = await req.json();

  const { chunks, sources, distances } = await retrieveContext(question, country);
  const confidence = getConfidence(distances);

  // Short-circuit if no useful context — saves API quota
  if (confidence < 0.3 || chunks.length === 0) {
    return Response.json({
      summary: "I don't have specific information about this procedure yet. Please check the official government website for " + (COUNTRY_NAMES[country] || country) + ".",
      steps: [], documents: [], office: null, fee_info: null,
      source_url: null, confidence, answerable: false,
    });
  }

  const result = await streamObject({
    model: anthropic('claude-sonnet-4-20250514'),
    schema: ProcedureAnswerSchema,
    system: chatSystemPrompt(language, country),
    prompt: `Question: ${question}\n\nContext from official ${COUNTRY_NAMES[country] || country} sources:\n${buildContext(chunks, sources)}`,
  });

  return result.toTextStreamResponse();
}
```

### app/api/analyze/route.ts

```typescript
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { DocumentRiskSchema, COUNTRY_NAMES } from '@/lib/types';

// Legal standards per country per document type
const LEGAL_STANDARDS: Record<string, Record<string, string>> = {
  DE: {
    rental: 'German BGB rental law: max deposit = 3 months cold rent (Kaltmiete). Minimum notice period = 3 months for tenant, varies for landlord. Landlord must give 24h advance notice before entering. Mietpreisbremse caps rent in many cities. Wohnungsgeberbestätigung required for address registration.',
    employment: 'German employment law (KSchG): minimum wage €12.41/hr. Probation (Probezeit) max 6 months. After 6 months in companies with 10+ employees, dismissal requires valid reason. Written termination required. Paid vacation: minimum 20 days (24 days based on 6-day week).',
    official_letter: 'German administrative law: deadlines in official letters are strict and legally binding. Widerspruch (appeal) typically within 1 month. Ignoring official letters may result in automatic decisions against you.',
  },
  NL: {
    rental: 'Dutch rental law: deposit max 2 months. Landlord must return deposit within 14 days of lease end. Annual rent increases capped by government index. Tenant has right to rental commission (huurcommissie) arbitration. Service costs must be itemized.',
    employment: "Dutch Wet op de arbeidsovereenkomst: 30% ruling (belastingvoordeel) available for highly skilled migrants earning above €46,107. Transition payment (transitievergoeding) = 1/3 month salary per year served, due on dismissal. Probation max 2 months for contracts over 6 months. Minimum 20 vacation days.",
  },
  PT: {
    rental: 'Portuguese NRAU rental law: minimum 1-year contract for residential rental. Annual increases tied to official inflation index. Landlord needs 120 days notice to terminate for own use. Tenant deposit typically 1-2 months, no legal max set. Alojamento local (short-term) different rules.',
    employment: 'Portuguese Código do Trabalho: 13th month (Natal) and 14th month (Férias) salary mandatory. Minimum 22 vacation days. Dismissal requires just cause (justa causa) or collective redundancy process. Sindicalização (union) rights protected.',
  },
  ES: {
    rental: 'Spanish LAU rental law: minimum 5-year contract for individual landlords (7 years for companies). Annual increases capped at CPI. Deposit max 2 months (fianza). Tenant may leave after 6 months with 30 days written notice. Landlord must declare deposit to regional authority.',
    employment: 'Spanish Estatuto de los Trabajadores: dismissal compensation = 33 days salary per year (unfair) or 20 days (fair/redundancy). Maximum 40 hours/week, overtime max 80/year. Minimum 30 calendar days annual leave. Social security (Seguridad Social) registration mandatory.',
  },
  FR: {
    rental: 'French law Alur/Elan: deposit max 1 month cold rent for unfurnished, 2 months for furnished. Landlord must return deposit within 1 month (no damage) or 2 months (with damage). Minimum notice: 3 months for tenant (1 month in certain zones). Encadrement des loyers caps rent in Paris and some cities.',
    employment: 'French Code du Travail: 35-hour work week standard. Minimum 5 weeks paid vacation. Indefinite contract (CDI) is the norm; fixed-term (CDD) has strict limits. Licenciement requires just cause and formal procedure. Arrêt maladie (sick leave) covered by Sécurité Sociale.',
  },
};

const DEFAULT_STANDARDS = 'Apply general European contract law standards. Flag any clause that appears one-sided, waives standard legal rights, or imposes unusual obligations on the weaker party.';

export async function POST(req: Request) {
  const { text, file_url, document_type = 'contract', country = 'DE' } = await req.json();

  // If only file_url provided (from upload), fetch text
  let documentText = text;
  if (!documentText && file_url) {
    const res = await fetch(file_url);
    documentText = await res.text();
  }

  if (!documentText) {
    return Response.json({ error: 'No document text provided' }, { status: 400 });
  }

  const standards = LEGAL_STANDARDS[country]?.[document_type] || DEFAULT_STANDARDS;

  const { object } = await generateObject({
    model: anthropic('claude-sonnet-4-20250514'),
    schema: DocumentRiskSchema,
    system: `You are a legal document analyst specializing in ${COUNTRY_NAMES[country] || country} contracts and official documents.
Your users are expats and foreigners who uploaded documents they cannot fully understand — often before signing.

Legal standards to apply for ${COUNTRY_NAMES[country] || country}:
${standards}

Your job:
- Identify every risky, unfair, or legally questionable clause — quote or closely paraphrase the problematic text
- Flag standard legal protections that are absent but should be there
- Note genuinely positive or well-drafted clauses
- Severity: HIGH = illegal clause or waives statutory rights | MEDIUM = below standard, should negotiate | LOW = worth noting
- verdict: one plain-English sentence bottom line for someone deciding whether to sign

CRITICAL: Always respond in English, even if the document is in another language.
Output ONLY the JSON object. No preamble. No markdown.`,
    prompt: `Document type: ${document_type}
Country jurisdiction: ${COUNTRY_NAMES[country] || country}

Document text:
${documentText.slice(0, 10000)}`,
  });

  return Response.json(object);
}
```

### app/api/journey/route.ts

```typescript
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { RelocationJourneySchema, COUNTRY_NAMES } from '@/lib/types';
import { retrieveContext, buildContext } from '@/lib/rag';

export async function POST(req: Request) {
  const {
    from_country = 'unknown',
    to_country = 'DE',
    nationality,
    purpose = 'work',
    language = 'en',
  } = await req.json();

  // Retrieve relevant procedures for the destination
  const query = `moving to ${to_country} ${purpose} residence permit registration`;
  const { chunks, sources } = await retrieveContext(query, to_country, 8);
  const context = buildContext(chunks, sources);

  const { object } = await generateObject({
    model: anthropic('claude-sonnet-4-20250514'),
    schema: RelocationJourneySchema,
    system: `You are an expert international relocation advisor.
Create a complete, phased relocation roadmap for someone moving to ${COUNTRY_NAMES[to_country] || to_country}.
Use the provided context for country-specific procedures. Fill gaps with accurate general knowledge.

Phases (use exactly these names):
1. "Before you leave" — things to do in the home country before departure
2. "First week in ${COUNTRY_NAMES[to_country] || to_country}" — immediate registrations and critical tasks
3. "First month" — permits, banking, healthcare, practical setup
4. "First 3 months" — longer-term requirements and integrations

Urgency:
- critical = legally required or blocks everything else
- important = strongly recommended
- optional = nice to have

Include realistic warnings about the most common mistakes people make in this move.
Respond in ${language === 'en' ? 'English' : language}.
Output ONLY the JSON object. No preamble. No markdown fences.`,
    prompt: `Relocating from: ${from_country}
Nationality: ${nationality || 'not specified'}
Destination: ${COUNTRY_NAMES[to_country] || to_country}
Purpose: ${purpose}

Context from ${COUNTRY_NAMES[to_country] || to_country} official sources:
${context}`,
  });

  return Response.json(object);
}
```

### app/api/compare/route.ts

```typescript
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { CountryComparisonSchema, COUNTRY_NAMES } from '@/lib/types';
import { retrieveContext, buildContext } from '@/lib/rag';

export async function POST(req: Request) {
  const { question, countries = ['DE', 'NL', 'PT', 'ES'] } = await req.json();

  // Retrieve context for all countries in parallel
  const contextByCountry = await Promise.all(
    countries.map(async (code: string) => {
      const { chunks, sources } = await retrieveContext(question, code, 3);
      return { code, name: COUNTRY_NAMES[code] || code, context: buildContext(chunks, sources) };
    })
  );

  const contextBlock = contextByCountry
    .map(c => `=== ${c.name} (${c.code}) ===\n${c.context}`)
    .join('\n\n');

  const { object } = await generateObject({
    model: anthropic('claude-sonnet-4-20250514'),
    schema: CountryComparisonSchema,
    system: `You are an expert in European immigration, residency, and relocation law.
Compare how different countries handle the same situation for someone relocating internationally.

Use the provided context for country-specific facts.
Fill gaps with accurate general knowledge about each country's procedures.
Be objective and genuinely useful — honest advantages AND disadvantages for each.
End with a clear recommendation that considers the question's implied priorities (speed, cost, ease, etc.).

difficulty rating: easy = straightforward process, mostly online, clear requirements | 
moderate = several steps, some in-person visits, some bureaucracy |
complex = lengthy process, many documents, uncertain timelines, language barriers significant.

Output ONLY the JSON object. No preamble. No markdown.`,
    prompt: `Comparison question: ${question}

Countries to compare: ${countries.join(', ')}

Context from official sources per country:
${contextBlock}`,
  });

  return Response.json(object);
}
```

---

## DEV 3 — INFRASTRUCTURE FILES

### lib/extract.ts

```typescript
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export async function extractTextFromUrl(fileUrl: string): Promise<string> {
  const res = await fetch(fileUrl);
  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get('content-type') || '';
  const url = fileUrl.toLowerCase();

  try {
    if (contentType.includes('pdf') || url.endsWith('.pdf')) {
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

function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}
```

### app/api/ingest/route.ts

```typescript
import { ChromaClient } from 'chromadb';
import { extractTextFromUrl } from '@/lib/extract';
import { chunkText } from '@/lib/chunk';
import { embedBatch } from '@/lib/embed';

const chroma = new ChromaClient({ path: process.env.CHROMA_URL || 'http://localhost:8000' });

export async function POST(req: Request) {
  const { file_url, text_override, metadata } = await req.json();

  const text = text_override ?? (file_url ? await extractTextFromUrl(file_url) : null);
  if (!text) return Response.json({ error: 'No text provided' }, { status: 400 });

  const chunks = chunkText(text);
  if (chunks.length === 0) return Response.json({ error: 'No content extracted' }, { status: 400 });

  const embeddings = await embedBatch(chunks);

  const collection = await chroma.getOrCreateCollection({
    name: 'procedures',
    metadata: { 'hnsw:space': 'cosine' },
  });

  const ts = Date.now();
  const pid = metadata?.procedure_id || `doc-${ts}`;
  const ids = chunks.map((_, i) => `${pid}-${i}-${ts}`);
  const metadatas = chunks.map(() => ({
    country:       metadata?.country      || 'DE',
    category:      metadata?.category     || 'general',
    source_url:    metadata?.source_url   || file_url || '',
    language:      metadata?.language     || 'en',
    procedure_id:  pid,
    title:         metadata?.title        || '',
    difficulty:    metadata?.difficulty   || 'moderate',
  }));

  await collection.upsert({ ids, documents: chunks, embeddings, metadatas });

  return Response.json({ chunks_created: chunks.length, procedure_id: pid });
}
```

### app/api/procedures/route.ts

```typescript
import { ChromaClient } from 'chromadb';

const chroma = new ChromaClient({ path: process.env.CHROMA_URL || 'http://localhost:8000' });

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const country = searchParams.get('country');
  const category = searchParams.get('category');

  const collection = await chroma.getOrCreateCollection({
    name: 'procedures',
    metadata: { 'hnsw:space': 'cosine' },
  });

  const where: Record<string, string> = {};
  if (country) where.country = country;
  if (category) where.category = category;

  const results = await collection.get({
    where: Object.keys(where).length ? where : undefined,
    include: ['metadatas'],
    limit: 500,
  });

  // Deduplicate by procedure_id, keep one entry per procedure
  const seen = new Map<string, any>();
  ((results.metadatas || []) as any[]).forEach(m => {
    if (m?.procedure_id && !seen.has(m.procedure_id)) {
      seen.set(m.procedure_id, {
        procedure_id: m.procedure_id,
        title: m.title || '',
        category: m.category || '',
        country: m.country || '',
        source_url: m.source_url || '',
        difficulty: m.difficulty || 'moderate',
      });
    }
  });

  return Response.json(Array.from(seen.values()));
}
```

### app/api/uploadthing/core.ts

```typescript
import { createUploadthing, type FileRouter } from 'uploadthing/next';
import { z } from 'zod';

const f = createUploadthing();

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
```

### app/api/uploadthing/route.ts

```typescript
import { createRouteHandler } from 'uploadthing/next';
import { ourFileRouter } from './core';
export const { GET, POST } = createRouteHandler({ router: ourFileRouter });
```

### docker-compose.yml

```yaml
version: "3.8"
services:
  chromadb:
    image: chromadb/chroma:latest
    ports:
      - "8000:8000"
    volumes:
      - ./chroma_data:/chroma/chroma
    environment:
      - CHROMA_SERVER_HOST=0.0.0.0
      - ANONYMIZED_TELEMETRY=false
```

---

## DEV 4 — FRONTEND PATTERNS

### lib/uploadthing.ts

```typescript
import { generateUploadDropzone, generateUploadButton } from '@uploadthing/react';
import type { OurFileRouter } from '@/app/api/uploadthing/core';

export const UploadDropzone = generateUploadDropzone<OurFileRouter>();
export const UploadButton = generateUploadButton<OurFileRouter>();
```

### Streaming chat — useObject hook pattern

```typescript
'use client';
import { experimental_useObject as useObject } from 'ai/react';
import { ProcedureAnswerSchema } from '@/lib/types';

// Always use this pattern for /api/chat
const { object, submit, isLoading, error } = useObject({
  api: '/api/chat',
  schema: ProcedureAnswerSchema,
});

// Submit
submit({ question, language, country });

// The object arrives PARTIALLY during streaming.
// ALWAYS guard each field before rendering:
// CORRECT:  {object.steps && object.steps.length > 0 && <StepsTimeline steps={object.steps} />}
// WRONG:    {<StepsTimeline steps={object.steps} />}   ← crashes during stream
```

### AnswerCard rendering rules

```
AnswerCard receives: Partial<ProcedureAnswer>
Render order (top to bottom):
  1. summary           → plain text paragraph
  2. steps             → numbered vertical timeline with connecting line
  3. documents         → interactive checklist with checkbox toggle (strikethrough on check)
  4. office + fee_info → info card with MapPin and CreditCard icons
  5. source_url        → small attribution link, ExternalLink icon
  6. answerable=false  → ClarificationPrompt component instead of steps/docs
  7. confidence < 0.5  → subtle "limited information available" badge on summary card
```

### DocumentAnalysisCard rendering rules

```
DocumentAnalysisCard receives: DocumentRisk
Render order:
  1. risk_level badge  → full-width banner: green=low, amber=medium, red=high
  2. summary           → plain text
  3. risks[]           → cards sorted by severity DESC. Each card shows:
                          - severity badge (colored)
                          - clause (quoted, italic)
                          - risk explanation
                          - recommendation (→ prefix)
  4. missing_clauses[] → red X bullets
  5. positive_points[] → green checkmark bullets
  6. verdict           → bold bottom line in a highlighted box
```

### Page mode structure

```typescript
// app/page.tsx — four modes, one page
const modes = [
  { id: 'chat',    label: 'Ask',            component: ChatInterface },
  { id: 'journey', label: 'Relocation Plan', component: JourneyPlanner },
  { id: 'compare', label: 'Compare',         component: CountryCompare },
  { id: 'analyze', label: 'Analyze Doc',     component: UploadAnalyze },
];
// Country selector and language selector live in the header, passed as props to each mode.
```

---

## THE 10 DEMO QUESTIONS

All must return correct, complete answers before demo time.

```typescript
export const DEMO_QUESTIONS = [
  {
    id: 'q1', mode: 'journey',
    prompt: { from_country: 'BR', to_country: 'DE', nationality: 'Brazilian', purpose: 'work' },
    label: 'Brazilian moving to Germany for work',
  },
  {
    id: 'q2', mode: 'chat',
    prompt: { question: "My Indian partner wants to join me in the Netherlands. What visa and permits does she need?", country: 'NL', language: 'en' },
    label: 'Partner visa Netherlands',
  },
  {
    id: 'q3', mode: 'chat',
    prompt: { question: "I want to retire in Portugal. I'm 61 and British. Tell me about the NHR tax regime and how to get a residence permit.", country: 'PT', language: 'en' },
    label: 'UK retirement to Portugal',
    hero: true, // pre-loaded on page load
  },
  {
    id: 'q4', mode: 'compare',
    prompt: { question: "Which EU country has the easiest and fastest work permit process for a non-EU software engineer?", countries: ['DE', 'NL', 'PT', 'ES'] },
    label: 'Best EU country for tech work permit',
  },
  {
    id: 'q5', mode: 'chat',
    prompt: { question: "I'm a US freelancer. Can I live in Georgia (the country) long-term legally? How does it work?", country: 'GE', language: 'en' },
    label: 'Digital nomad in Georgia',
  },
  {
    id: 'q6', mode: 'chat',
    prompt: { question: "I received an official letter from the German Ausländerbehörde. What do they typically want and what are my deadlines?", country: 'DE', language: 'en' },
    label: 'German official letter',
  },
  {
    id: 'q7', mode: 'analyze',
    document_type: 'rental', country: 'DE',
    label: 'German rental agreement risk check',
  },
  {
    id: 'q8', mode: 'analyze',
    document_type: 'employment', country: 'NL',
    label: 'Dutch employment contract check',
  },
  {
    id: 'q9', mode: 'chat',
    prompt: { question: "I want to bring my elderly mother to live with me in Spain under family reunification. What is the full process?", country: 'ES', language: 'en' },
    label: 'Family reunification Spain',
  },
  {
    id: 'q10', mode: 'chat',
    prompt: { question: "I'm Ukrainian living in Poland on temporary protection. What are my options for longer-term legal status?", country: 'PL', language: 'en' },
    label: 'Ukrainian in Poland - long-term status',
  },
];
```

---

## COMMON ERRORS AND EXACT FIXES

**ChromaDB collection not found:**
Always use `getOrCreateCollection`, never `getCollection`. The latter throws if missing.

**`useObject` types — import error:**
```typescript
import { experimental_useObject as useObject } from 'ai/react'; // correct
import { useObject } from 'ai/react'; // wrong — this doesn't exist
```

**streamObject fields undefined during stream:**
The schema fields arrive progressively. Always guard: `object?.steps?.map(...)` never `object.steps.map(...)`.

**pdf-parse import in Next.js App Router:**
```typescript
// At the top of any route using pdf-parse:
const pdfParse = (await import('pdf-parse')).default;
// Do NOT import at module level — it crashes Next.js build
```

**ChromaDB `where` filter with one field only:**
```typescript
// Correct — single condition
where: { country: 'DE' }
// Correct — multiple conditions  
where: { $and: [{ country: { $eq: 'DE' } }, { category: { $eq: 'rental' } }] }
// Wrong — this syntax with multiple direct fields may fail
where: { country: 'DE', category: 'rental' }
```

**OpenAI rate limit during seed:**
Add `await new Promise(r => setTimeout(r, 600))` between each procedure in the seed loop.

**UploadThing file URL not immediately accessible:**
Add 300ms delay before fetching the URL in the ingest route after upload completes.

**Anthropic free tier (5 req/min):**
The `/api/compare` endpoint makes parallel LLM calls — use `Promise.all` only for ChromaDB queries, then make ONE LLM call with all contexts combined.

**`maxDuration` not working on Vercel free tier:**
Free tier max is 10 seconds. Set `export const maxDuration = 10` on streaming routes.
If this is too short, deploy to Railway instead of Vercel for the API routes.

---

## HOW TO USE THIS FILE

At the start of every AI coding session:

1. Paste this entire file into your AI assistant (Cursor, Claude, ChatGPT)
2. Then say one of the following:

**Dev 1:** "I am Dev 1 working on [lib/rag.ts | lib/embed.ts | scripts/seed.ts | data/seed/*.json]. Help me implement [specific task]. Use exactly the types and patterns defined in this context file."

**Dev 2:** "I am Dev 2 working on [app/api/chat | app/api/analyze | app/api/journey | app/api/compare]. Help me implement [specific task]. Do not change the Zod schemas. Use streamObject for /api/chat and generateObject for all others."

**Dev 3:** "I am Dev 3 working on [app/api/ingest | lib/extract.ts | app/api/uploadthing | docker-compose.yml]. Help me implement [specific task]. The ingest route must accept both file_url and text_override."

**Dev 4:** "I am Dev 4 working on [component name]. Here is the data type it receives: [paste the relevant schema from this file]. Build the component using Tailwind and lucide-react. It must handle partial/undefined fields because data streams in progressively."

**For v0.dev (UI only):**
Do NOT paste this whole file. Paste only the relevant TypeScript type and say:
"Build a React component that receives this data: [paste one schema]. Show [describe the visual layout]."
