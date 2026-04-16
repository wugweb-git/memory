# Layer 1: Memory & Ingestion Core

Layer 1 is the foundational storage and retrieval engine for the Identity Prism OS. It is designed to be "Blob-first," minimizing external dependencies while maintaining high performance for RAG (Retrieval-Augmented Generation).

## Core Architecture

### 1. Ingestion Infrastructure
- **Endpoints**: `POST /api/memory/ingest`, `POST /api/ingest/soul` (Spirit Notes), `POST /api/ingest/pulse` (Telemetry).
- **Validation**: Enforces strict payload contracts before processing to ensure data integrity.
- **Queueing**: Implements adaptive retries and governance to handle high-volume ingress.

### 2. Storage Strategy (Blob-first)
- **Primary Store**: Vercel Blob serves as the primary JSON datastore for runtime states, avatars, and configuration.
- **Fallback**: Supports an in-memory store for local development smoke tests when credentials are absent.
- **MongoDB**: Optional but recommended for long-term telemetry and historical logs.

### 3. RAG & Retrieval
- **Vector Prep**: Prepares data for vector embedding with focused signal extraction.
- **Search**: Optimized for fast retrieval of context for the interpretation layers.

## Security & Governance
- **Authorization**: Hardened `AUTH_SECRET` validation (production-grade).
- **Hardening**: Fail-closed mechanism for missing environment variables.
- **Audit Trails**: Real-time logging of ingestion events and storage state.

## Recycling Logic
- Redundant logic from various feature branches has been consolidated here to maintain a linear and stable ingestion pipeline.
