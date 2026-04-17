# Layer 1: Neural Memory Core

Layer 1 is the foundational ingestion and retrieval engine for the Identity Prism OS. It handles the transition from raw environmental data to standardized, searchable **MemoryPackets**.

## Core Architecture

### 1. Ingestion Infrastructure
- **Standardized Packet**: All incoming data (Spirit Notes, Pulse Telemetry, CRM items) is transformed into a `MemoryPacket` structure.
- **Validation**: Strict payload contracts ensure ingestion integrity before downstream processing.
- **Scoping**: Every packet is assigned a `test_run_id` to maintain architectural isolation.

### 2. Neural Storage (MongoDB + Vector)
- **Primary Persistence**: MongoDB serves as the source of truth for all memory packets and their metadata.
- **Vector Search**: Integrated RAG (Retrieval-Augmented Generation) uses specialized indices for high-fidelity context retrieval.
- **Asset Storage**: Vercel Blob remains the primary store for large binary assets and file uploads.

### 3. RAG Retrieval
- **Scoped Search**: Vector retrieval is strictly isolated by `test_run_id` at the query level.
- **Signal-First Indexing**: Retrieval is optimized based on extracted behavioral signals, providing higher relevance than simple keyword search.

## Security & Governance
- **Authorization**: Hardened JWT/Auth validation for all ingestion and retrieval paths.
- **Environment Shielding**: Fail-closed mechanism prevents ingestion if core secrets are missing.
