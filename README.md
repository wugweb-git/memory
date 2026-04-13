# Memory System — Phase 1 (Ingestion Engine)

Serverless memory ingestion system for Vercel using MongoDB + Mongoose.

## Endpoints

- `GET /api` health index
- `GET /api/items` latest 50 items
- `POST /api/items` create manual item `{ raw }`
- `POST /api/sync` sync external items
- `POST /api/email` ingest email payload
- `GET /api/health` list broken-link items

## Vercel 404 Fix

This repo includes:

- `api/index.js` for `/api`
- explicit route mapping in `vercel.json` for `/api/*`
- root route `/` mapped to `test/index.html`

## Environment

```env
MONGO_URI=your_mongo_string
```
