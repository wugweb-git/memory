# Memory System — Phase 1 (Ingestion Engine)

Serverless Node.js + MongoDB ingestion API for raw memory capture on Vercel.

## Endpoints

- `GET /api`
- `GET /api/test`
- `GET /api/items`
- `POST /api/items`
- `POST /api/sync`
- `POST /api/email`
- `GET /api/health`

## Root URL

- `/` serves `index.html` to avoid Vercel root `404: NOT_FOUND`.
- `/test/index.html` serves the simple UI.

## Env

- `MONGO_URI`

## Vercel deployment settings (recommended)

Set these in the Vercel project dashboard:

- **Framework Preset:** `Other`
- **Root Directory:** repository root (the folder containing `api/`, `vercel.json`, `package.json`)
- **Build Command:** *(empty)*
- **Output Directory:** *(empty)*
- **Install Command:** `npm install`
- **Node.js Version:** `20.x`
- **Production Branch:** `main`

Also set Environment Variables:

- `MONGO_URI=<your mongo atlas uri>`

After deploy, verify in this exact order:

1. `/`
2. `/api`
3. `/api/test`
4. `/api/items`
5. `/test/index.html`
