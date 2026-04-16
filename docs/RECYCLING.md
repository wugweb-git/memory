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
- **Obsolete API routes**: `api/memory/retrieve`, `api/memory/stats` (Consolidated into L1 Monitor).
- **Prisma Migrations (Archived)**: Project has transitioned to a Mongo/Blob-first model.

## How to Recycle
To reuse a component, reference the commit SHA from the `v0.9-legacy` tag or the `audit-resolution` history (before deletion). 
Labels used for recycling: `important/recycle`.
