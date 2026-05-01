# Railway ChromaDB Deployment Guide

## Overview

This guide explains how to deploy ChromaDB on Railway and configure BureaucracyAI to use it.

## Option 1: Railway (Recommended)

### Step 1: Deploy ChromaDB on Railway

1. Go to [railway.new](https://railway.new)
2. Click "New Project" → "Deploy a Service"
3. Search for "chroma" or use this Docker image:
   ```
   chromadb/chroma:latest
   ```
4. Configure the service:

**Environment Variables:**
```
ANONYMIZED_TELEMETRY=false
```

**Port Configuration:**
- Container Port: `8000`
- Public Networking: `Enable`

5. Deploy and note the URL: `https://your-project.railway.app`

### Step 2: Get Your ChromaDB URL

After deployment, your ChromaDB instance will be accessible at:
```
https://xxxxx-xxxxx.up.railway.app
```

### Step 3: Configure .env.local

Update your `.env.local` file:

```bash
# Railway ChromaDB (production)
CHROMA_URL=https://xxxxx-xxxxx.up.railway.app

# Local development (optional, for fallback)
# CHROMA_URL=http://localhost:8000
```

## Option 2: Railway with Docker Compose

If you prefer using Railway's docker-compose support:

1. Create a `railway.json` file:
```json
{
  "$schema": "https://railway.app/schema.json",
  "build": {
    "dockerfile": "Dockerfile"
  },
  "deploy": {
    "numReplicas": 1,
    "healthcheckPath": "/api/v2/heartbeat",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

2. Commit and push to GitHub
3. Railway will auto-detect and deploy

## Option 3: Railway Reference (Most Common)

Many teams deploy ChromaDB via the Railway CLI:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link project
railway link

# Add ChromaDB
railway add

# Set environment variable
railway variables set CHROMA_URL=$RAILWAY_STATIC_URL
```

## Testing Your Deployment

### Health Check

```bash
curl https://your-chroma-url.up.railway.app/api/v2/heartbeat
```

Should return:
```json
{"nanosecond heartbeat": 1777104749360257468}
```

### Create Collection

```bash
curl -X POST https://your-chroma-url.up.railway.app/api/v2/collections \
  -H "Content-Type: application/json" \
  -d '{"name":"procedures","get_or_create":true}'
```

## Troubleshooting

### Connection Refused
- Ensure public networking is enabled on Railway
- Check if the service is running in Railway dashboard

### CORS Issues
ChromaDB requires CORS headers. Add this to your deployment:
```
IS_PERSISTENT=TRUE
ALLOWED_ORIGINS=*
```

Or use a reverse proxy (like nginx or Cloudflare) that adds CORS headers.

### Authentication
Currently, ChromaDB doesn't have built-in auth. For production:
1. Use Railway's private networking
2. Add API key authentication via middleware
3. Or use ChromaDB Cloud (managed)

## Security Notes

⚠️ **Important:** ChromaDB does NOT have built-in authentication by default.

For production deployments, consider:

1. **Private networking**: Use Railway's private networking to restrict access to your Next.js app
2. **API Gateway**: Put ChromaDB behind an API gateway with authentication
3. **VPN**: Use a VPN to access ChromaDB
4. **Cloudflare Tunnel**: Use Cloudflare tunnel for secure public access

## Getting the Railway URL

1. Go to your Railway project dashboard
2. Click on the ChromaDB service
3. Go to Settings → Networking
4. Copy the public URL
5. Use this as `CHROMA_URL` in your `.env.local`

## Next Steps

1. ✅ Deploy ChromaDB on Railway
2. ✅ Get the public URL
3. ✅ Update `CHROMA_URL` in environment variables
4. ✅ Test the connection with `/api/health`
5. ✅ Seed data with `npx tsx scripts/seed.ts`
