# Memory System — Phase 1 (Ingestion Engine)

A backend-first memory system that captures raw data (manual + synced), prevents duplication, tracks changes over time, and maintains source-linked memory.

## Features (Phase 1 ONLY)

- Manual input (`POST /items`)
- External sync (`POST /sync`)
- Deduplication (`URL` / `external_id`)
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

## Philosophy

"Capture everything. Interpret later."

## Future (Phase 2)

- signal extraction
- pattern detection
- identity formation

## Repo Structure

- `src/server.js` - Express bootstrap + MongoDB connection
- `src/routes/items.js` - API routes
- `src/controllers/itemController.js` - request handlers
- `src/models/item.model.js` - Item schema
- `src/models/healthQueue.model.js` - Health queue schema
- `src/utils/linkHealth.js` - link status helper
- `test/index.html` - minimal frontend UI
