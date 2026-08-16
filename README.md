# Identity Prism OS

A Personal Cognitive Operating System (POS). Not a dashboard — a Decision Console designed to observe, understand, evolve, and act alongside its user.

---

## System Philosophy

> **2026-07 architecture change:** MongoDB was fully dropped. All layers
> (L0–L5) now live on a single Neon (Postgres) database with pgvector for
> embeddings. The Atlas cluster is kept only as a cold, read-only archive.
> See `CLAUDE.md` for the authoritative, currently-maintained architecture
> doc — this file covers the conceptual model and dev workflow.

| Layer | Role | Storage |
|---|---|---|
| L0 | Raw intake / blob buffer | Vercel Blob + Neon (`blob_items`) |
| L1 | Immutable memory packets + pgvector RAG | Neon (Postgres) |
| L2 | Signals + patterns | Neon (Postgres) |
| L2.5 | Semantic graph (entities, relationships, topics) | Neon (Postgres) |
| L3 | Reasoning + decisions | Neon (Postgres) |
| L4 | Digital Twin (traits, style, persona) | Neon (Postgres) |

One-line truth: **L1 = memory. L2 = signals. L2.5 = meaning. L3 = thinking. L4 = who you are becoming.**

---

## Tech Stack

| Concern | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Database | Neon (Postgres) via Prisma — single client, one schema (`prisma/postgres/schema.prisma`) |
| Embeddings | LangChain + OpenAI (`text-embedding-3-small`), stored in pgvector (`vector(1536)`, HNSW cosine index) |
| Cognitive LLM | Gemini (`@langchain/google-genai`), model overridable via `GEMINI_MODEL` — see `src/lib/cognitive/llm.ts` for the current default and why it needs to be revisited periodically as Google retires model IDs |
| Chat LLM | Generic OpenAI-compatible: AI Gateway → Groq → OpenAI, in that priority (`src/app/api/chat/route.ts`) |
| Vector search | pgvector cosine search on Neon |
| File storage | Vercel Blob |
| Observability | Langfuse |
| Deployment | Vercel (cron-triggered background jobs — see `vercel.json` and `src/jobs/`) |
| CI/CD | GitHub Actions |

---

## Layer 3 — Cognitive Engine

The decision core. Full spec: [`docs/layer-3-cognitive.md`](./docs/layer-3-cognitive.md).

### Endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/cognitive/decide` | Get direction — context → LLM → structured decision |
| POST | `/api/cognitive/evaluate` | Evaluate JD / brief / idea against memory context |
| POST | `/api/cognitive/gaps` | Deterministic gap analysis — no LLM |
| POST | `/api/cognitive/prioritize` | Rank items by signal alignment |
| POST | `/api/cognitive/feedback` | Capture accept/ignore/reject → trigger L4 evolution |
| GET  | `/api/cognitive/history` | Decision registry with feedback status |

### Pipeline

```
buildContext (L1 + L2 + L2.5 + L4) → prompt → LLM → sanitize → dedup → critic → log → return
```

### Operating Modes

- **Architect** — systems, structure, long-term
- **Founder** — leverage, market, outcomes
- **Operator** — execution, blockers, daily momentum

---

## Layer 1 — Memory

Full spec: [`docs/layer-1-memory.md`](./docs/layer-1-memory.md)

- Ingestion via `/api/upload` — PDF, TXT, HTML, JSON, MD
- Embedding via LangChain + OpenAI `text-embedding-3-small`
- RAG retrieval with MMR (Maximal Marginal Relevance)
- Embedding worker + retry with exponential backoff — runs via `/api/jobs/process`
  (`src/jobs/memory-pipeline.ts`), triggered by Vercel Cron. **Not** an
  in-process scheduler — the old `node-cron`-based approach never actually
  ran on Vercel's serverless model; see `docs/audit/AUDIT_2026-08-16.md`.

---

## Layer 2 — Signals

Full spec: [`docs/layer-2-intelligence.md`](./docs/layer-2-intelligence.md)

- Signal extraction from memory packets
- Pattern detection (activity density, trajectory, momentum)
- L2 + L2.5 processing also runs via `/api/jobs/process` in the same pass as
  the embedding worker, cron-triggered (see `vercel.json`)

---

## Prisma Setup

One database, one Prisma client — every layer (L0–L5) reads and writes through it:

```ts
import { postgres } from '@/lib/db/postgres';
// schema: prisma/postgres/schema.prisma
// generated: src/generated/postgres
```

Embeddings use pgvector (`vector(1536)` columns) — Prisma can't bind `Unsupported`
column types directly, so those queries go through `$queryRaw`.

Generate the client after any schema change:
```bash
npm run prisma:generate
```

Apply pending migrations (also runs automatically as part of `npm run build`,
so schema and the live database can't silently drift apart again):
```bash
npx prisma migrate deploy --schema=prisma/postgres/schema.prisma
```

---

## Environment Variables

```env
# Postgres (Neon) — no plain DATABASE_URL, uses the brain_* pooled/direct pair
brain_POSTGRES_PRISMA_URL=
brain_POSTGRES_URL_NON_POOLING=

# OpenAI (embeddings; chat fallback if no Groq/gateway)
OPENAI_API_KEY=
OPENAI_CHAT_MODEL=        # optional override, see src/app/api/chat/route.ts

# Gemini (cognitive LLM)
GEMINI_API_KEY=
GEMINI_MODEL=              # optional override, see src/lib/cognitive/llm.ts

# Groq (optional, stable fallback for chat + cognitive)
GROQ_API_KEY=
GROQ_MODEL=

# Vercel Blob
BLOB_READ_WRITE_TOKEN=

# Langfuse observability
LANGFUSE_PUBLIC_KEY=
LANGFUSE_SECRET_KEY=
LANGFUSE_HOST=

# Sanity CMS (public showcase)
SANITY_PROJECT_ID=
SANITY_DATASET=
SANITY_API_TOKEN=

# Auth
AUTH_SECRET=
ADMIN_EMAIL=
ADMIN_PASSWORD=

# Background jobs (/api/jobs/run, /api/jobs/process)
CRON_SECRET=                # sent by Vercel Cron automatically
JOB_SECRET=                 # for manual/external triggers
```

Pull real values from Vercel (never commit real secrets):
```bash
vercel env pull .env.local
```

---

## Scripts

```bash
npm run dev          # local dev
npm run build        # prisma generate → prisma migrate deploy → next build
npm run prisma:generate       # regenerate the Prisma client
npm run prisma:migrate:pg     # create a new migration locally (prisma migrate dev)
```

---

## Deployment

Hosted on Vercel. Every push to `main` triggers a production deploy.

Project: `https://vercel.com/wugweb/memory`
Live URL: `https://memory-git-main-wugweb.vercel.app` (stable `main` alias)

Most API routes set `export const dynamic = 'force-dynamic'` to prevent static collection at build time. Routes that read request data (`req.json()`, query params, cookies) are inferred as dynamic by Next.js even without the explicit export.

---

*Identity Prism: The evolution of the second brain.*
