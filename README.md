# Identity Prism OS — Layer 2.5 (Hardened Semantic Engine)

Identity Prism is a proactive behavioral OS built on a multi-layer semantic architecture. It has evolved from a simple ingestor into a hardened, production-grade intelligence engine capable of high-fidelity signal extraction, entity reconciliation, and proactive pattern recognition.

## 🏗️ System Architecture (The Layers)

The system is organized into decoupled layers to ensure operational integrity and scalability:

- **[Layer 1: Neural Memory](docs/layer-1-memory.md)**: Standardized ingestion and RAG core. Enforces the "Packet" contract.
- **[Layer 2: Signal Interpretation](docs/layer-2-processing.md)**: Real-time telemetry extraction (category, intensity, category).
- **[Layer 2.5: Semantic Intelligence (LOCKED)](docs/layer-2.5-enrichment.md)**: Hardened governance, entity reconciliation, and environment isolation.
- **Layer 3: Action Engine (INCOMING)**: Proactive behavioral layer for autonomous tasks and suggestions.

---

## 🔒 Operational Hardening (L2.5)

To ensure production stability, the system implements **Operational Hardening** at Layer 2.5:

1.  **Environment Isolation**: Strict `test_run_id` flow ensures test data never pollutes production read paths or vector store results. 
2.  **Atomic Write Flow**: Uses a `pending` -> `complete` state transition to simulate transactions and prevent partial visibility during semantic digestion.
3.  **Concurrency Safety**: Identity creation is guarded by `dedup_hash` unique constraints and `isUniqueError` handling in the application layer.
4.  **Diagnostic Audit**: A 20-point diagnostic suite ensures isolation and integrity across 15+ data models.

---

## 🚀 API Control Surface

### Core Memory APIs
- `POST /api/memory/ingest`: Ingest raw content into L1.
- `GET /api/memory/list`: List packets with mandatory `test_run_id` scoping.
- `POST /api/memory/retrieve`: High-fidelity vector search/RAG retrieval.
- `GET /api/memory/stats`: Project-wide telemetry stats.

### Layer 2 & 2.5 Semantic APIs
- `GET /api/processing/entities`: Scoped list of normalized entities (Person, Project, Concept).
- `GET /api/processing/signals`: Real-time behavioral signal stream.
- `GET /api/processing/topics`: Distribution of thematic topics.
- `GET /api/processing/intelligence`: Behavioral patterns and descriptive insights.
- `GET /api/processing/semantic`: Full semantic objects for specific packets.

### Administrative & Diagnostics
- `POST /api/admin/semantic-diagnose`: Trigger the 20-point hardening audit.
- `GET /api/admin/system-health`: Global system health monitoring.
- `POST /api/admin/cleanup`: native script for purging environment-scoped test data.

---

## 🔑 Environment Variables

Required for Production:
- `AUTH_SECRET`: Core auth security.
- `MONGODB_URI`: Primary NoSQL and Vector Store.
- `OPENAI_API_KEY`: LLM operations (GPT-4o).
- `BLOB_READ_WRITE_TOKEN`: File/Avatar storage (Vercel Blob).

Recommended:
- `GEMINI_API_KEY`: Fallback LLM and high-throughput extraction.
- `JOB_SECRET`: Secures background processing cycles.

---

## Scripts

```bash
# Health/audit checks
AUTH_SECRET="<secret>" npm run audit
AUTH_SECRET="<secret>" npm run test:e2e
AUTH_SECRET="<secret>" npm run db:ping
AUTH_SECRET="<secret>" ALLOW_IN_MEMORY_STORE=true ./scripts/verify-all.sh
./scripts/setup-origin.sh <git-remote-url>
./scripts/vercel-readiness.sh
./scripts/check-deployment-url.sh https://<your-vercel-app>.vercel.app
./scripts/check-auth-flow.sh https://<your-vercel-app>.vercel.app

# Jobs and data lifecycle
AUTH_SECRET="<secret>" npm run jobs
AUTH_SECRET="<secret>" npm run backup
AUTH_SECRET="<secret>" npm run restore -- backups/<file>.json
```

### Branch reconciliation helper

If you need to merge all local branches into `main` quickly:

```bash
./scripts/merge-all-branches.sh main
```

This script only merges **local** branches. If GitHub remote branches are missing locally, run `git fetch --all --prune` first in a repo with a configured `origin`.

### Why Vercel may not reflect local changes

Vercel Git deployments only update when commits are pushed to the connected remote branch.

If local changes are visible but Vercel is stale, run:

```bash
./scripts/vercel-readiness.sh
```

It validates:
- required deployment files (`vercel.json`, `api/index.js`, `index.html`, `package.json`)
- `vercel.json` JSON syntax
- whether remote `origin` exists
- branch ahead/behind status versus remote

If `origin` is missing in your environment, configure it with:

```bash
./scripts/setup-origin.sh <git-remote-url>
```

## Repository Maintenance (Clean History)

To maintain a clean, linear Git history and avoid messy "octopus" merges:

1. **Configure Pull Strategy**:
   Run this once on your machine:
   ```bash
   git config pull.rebase true
   ```

2. **GitHub Merge Strategy**:
   Always use **"Squash and Merge"** or **"Rebase and Merge"** on Pull Requests. Avoid standard merge commits.

3. **Synchronize Local Workbench**:
   If the remote history has been rewritten (e.g., after an automated cleanup), align your local graph:
   ```bash
   git fetch origin && git reset --hard origin/main
   ```

### Branch policy

`scripts/verify-all.sh` enforces a local branch policy: maximum 3 branches unless explicitly overridden by team workflow.

## Notes

- `scripts/backup.js` and `scripts/restore.js` now operate on the Blob-backed JSON datastore (`users/items/sources/logs/metrics/health`).
- If `BLOB_READ_WRITE_TOKEN` is not set, data will run in memory for the process lifetime (useful for local dev smoke tests).
- `index.html` is a production-oriented single-page client (auth + capture tabs + feed + health/logs/automation), optimized for desktop and mobile.

## Spirit Note + Pulse payload guidance (v2 contract)

`POST /api/ingest/soul` expects manual note structure:

```json
{
  "source_type": "spirit_note",
  "source_origin": "manual",
  "raw_payload": {
    "title": "How I design resilient systems",
    "body": "Long-form note ...",
    "context": "project",
    "signal_intent": "pattern",
    "logic_pattern": "system_design",
    "evidence_links": ["https://github.com/org/repo/pull/123"]
  }
}
```

`POST /api/ingest/pulse` expects telemetry event structure:

```json
{
  "platform": "github",
  "event_id": "evt_123",
  "external_id": "sha-or-guid",
  "raw_payload": { "original": "webhook payload" },
  "candidate_text": "clean summary text for memory update"
}
```
