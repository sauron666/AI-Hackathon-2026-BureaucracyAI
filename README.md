# AI-Hackathon-2026

## Sirma KB CLI (Embedding Pipeline)

Use the helper script at `scripts/sirma-kb.ts` to manage Knowledge Base embedding flow end-to-end.

Prerequisites:

- `.env.local` has `SIRMA_API_KEY` and either `SIRMA_BASE_URL` or `SIRMA_AI_DOMAIN`
- Run commands from repo root

Examples:

```powershell
npx tsx scripts/sirma-kb.ts providers
npx tsx scripts/sirma-kb.ts list
```

```powershell
npx tsx scripts/sirma-kb.ts create --project-id 295 --name "Dev1 KB" --llm-config-id 1611 --embedding-model-id gemini-embedding-001
```

```powershell
npx tsx scripts/sirma-kb.ts upload --vector-store-id <VECTOR_STORE_ID> --file C:\Users\PC\Downloads\data.md
npx tsx scripts/sirma-kb.ts files --vector-store-id <VECTOR_STORE_ID>
```

## AI Routes Tests

- Create python venv
- run:

```bash
pip install -r requirements.txt
npm run dev
python scripts/run_dev2_routes.py
pytest tests/test_dev2_routes.py
```
