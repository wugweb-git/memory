# Logic Recycling Bin

This document tracks valuable logic, features, and patterns identified in closed or deferred Pull Requests (#1 through #36). This ensures that prior work is accessible for "recycling" into the production branches.

## Tracked Components

### 1. Advanced UI Components (Recycled from 2026-04-14 branches)
- **Signal Timeline**: Component for visualizing memory pulse events. (Deferred during L1 lock).
- **Packet Inspector**: Detailed view for L2 processing packets. (Integrated into `admin` diagnostic surface).
- **Rag Tester**: Local testing utility for RAG accuracy.

### 2. Experimental Logic (Recycled from Codex branches)
- **Adaptive Normalization**: Logic for handling non-standard telemetry payloads. (Currently in `RECYCLING` status).
- **Noise Filtering (Experimental)**: Advanced signal-to-noise ratio detection for L1 ingestion.

### 3. Cleanup & Purge Registry
- **Legacy Express handler**: `api/index.js`, `src/server.js`, `src/routes/`, `src/models/` (Mongoose) — deprecated parallel API surface. See [`legacy-api.md`](./legacy-api.md) for the removal plan (audit callers first).
- **Unused dependencies**: `multer`, `react-router-dom`, `pdf2json`, `pdfreader`, `pdfjs-dist` — referenced in zero files; candidates for removal.

> **Correction (2026-06):** earlier revisions of this doc listed `api/memory/retrieve` and `api/memory/stats` as obsolete and claimed the project had "transitioned away from Prisma." Both were inaccurate — those routes are live (see [`API_ENDPOINTS.md`](./API_ENDPOINTS.md)) and Prisma remains the ORM for **both** the Mongo (L0–L2.5) and Postgres/Neon (L3–L5) clients.

## How to Recycle
To reuse a component, reference the commit SHA from the `v0.9-legacy` tag or the `audit-resolution` history (before deletion). 
Labels used for recycling: `important/recycle`.
