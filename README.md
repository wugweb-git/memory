# Memory System — Phase 1 (Ingestion Engine)

A backend-first memory system that captures raw data (manual + synced), prevents duplication, tracks changes over time, and maintains source-linked memory.

## Features (Phase 1 ONLY)

- Manual input (`POST /items`)
- File upload ingestion (`POST /upload`)
- Email webhook ingestion (`POST /email`)
- External sync (`POST /sync`)
- Deduplication (`URL` / `external_id` / hash for email)
- Versioning (history tracking)
- Change detection (hash-based)
- Link health tracking
- Health queue (broken links)

## What is NOT included

- No AI
- No tagging
- No embeddings
- No identity layer

## Tech Stack

- Node.js (Express)
- MongoDB (Mongoose)
- REST API

## API Endpoints

- `POST /items` → create memory
- `GET /items` → fetch memory
- `POST /sync` → sync external data
- `POST /upload` → upload file and create memory
- `POST /email` → ingest forwarded email payload
- `GET /health-queue` → broken links

## Local Setup

```bash
npm install
cp .env.example .env
npm start
```

Environment variables:

- `MONGO_URI`
- `PORT`

## Vercel Deployment

This repo includes `vercel.json`, `api/items.js`, and `lib/mongodb.js`.

- Serverless endpoint is available at `/api/items` through `api/items.js`.
- Static UI is available at `/test/index.html`.
- On Vercel, file uploads are stored in `/tmp/uploads` (ephemeral).

## n8n RSS Automation (exact)

1. Add **RSS Feed** node.
   - URL example: `https://medium.com/feed/@yourusername`
2. Add **HTTP Request** node.
   - Method: `POST`
   - URL: `http://localhost:5000/sync`
   - Body JSON:

```json
{
  "raw": "{{ $json.title }} - {{ $json.contentSnippet }}",
  "url": "{{ $json.link }}",
  "external_id": "{{ $json.guid }}",
  "platform": "medium"
}
```

3. Connect `RSS Feed -> HTTP Request`.
4. Activate workflow.

## Philosophy

"Capture everything. Interpret later."

## Future (Phase 2)

- signal extraction
- pattern detection
- identity formation

## Repo Structure

- `src/app.js` - shared Express app
- `src/server.js` - local startup + MongoDB connection
- `api/index.js` - Vercel serverless entrypoint
- `src/routes/items.js` - API routes
- `src/controllers/itemController.js` - request handlers
- `src/models/item.model.js` - Item schema
- `src/models/healthQueue.model.js` - Health queue schema
- `src/utils/linkHealth.js` - link status helper
- `test/index.html` - minimal frontend UI
- `uploads/` - local file storage


## Vercel Serverless API

- `api/items.js` provides `GET` and `POST` for `/api/items`.
- Uses `lib/mongodb.js` with global mongoose connection caching.
- No `app.listen` is used in serverless function mode.

Environment variable:

- `MONGO_URI=your_mongo_string`
