# Identity Prism OS

A Personal Cognitive Operating System (POS). Not a dashboard — a Decision Console designed to observe, understand, evolve, and act alongside its user.

---

## System Philosophy

| Layer | Role | Storage |
|---|---|---|
| L0 | Raw intake / blob buffer | Vercel Blob |
| L1 | Immutable memory packets | MongoDB |
| L2 | Signals + patterns | MongoDB |
| L2.5 | Semantic graph (entities, relationships, topics) | MongoDB |
| L3 | Reasoning + decisions | Neon (Postgres) |
| L4 | Digital Twin (traits, style, persona) | Neon (Postgres) |

One-line truth: **L1 = memory. L2 = signals. L2.5 = meaning. L3 = thinking. L4 = who you are becoming.**

---

## Tech Stack

| Concern | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Memory DB | MongoDB via Prisma (custom output path `src/generated/mongo`) |
| Intelligence DB | Neon (Postgres) via Prisma (custom output path `src/generated/postgres`) |
| AI / LLM | LangChain + GPT-4o-mini (structured) + GPT-4o (complex, Phase 4) |
| Vector search | MongoDB Atlas Vector Search |
| File storage | Vercel Blob |
| Observability | Langfuse |
| Automation | n8n (Phase 4) |
| Deployment | Vercel |
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
- Scheduler: embedding worker (every 1 min), retry with exponential backoff

---

## Layer 2 — Signals

Full spec: [`docs/layer-2-intelligence.md`](./docs/layer-2-intelligence.md)

- Signal extraction from memory packets
- Pattern detection (activity density, trajectory, momentum)
- Scheduler: L2 + L2.5 processing (every 2 min)

---

## Prisma Setup

Two separate Prisma clients — never mix them:

```ts
// MongoDB — L0 through L2.5
import { mongo as prisma } from '@/lib/db/mongo';
// schema: prisma/mongo/schema.prisma
// generated: src/generated/mongo

// Postgres (Neon) — L3 + L4
import { postgres } from '@/lib/db/postgres';
// schema: prisma/postgres/schema.prisma
// generated: src/generated/postgres
```

Generate both:
```bash
npm run prisma:generate
```

---

## Environment Variables

```env
# MongoDB
MONGODB_URI=

# Postgres (Neon)
DATABASE_URL=

# OpenAI
OPENAI_API_KEY=

# Vercel Blob
BLOB_READ_WRITE_TOKEN=

# Langfuse observability
LANGFUSE_PUBLIC_KEY=
LANGFUSE_SECRET_KEY=
LANGFUSE_HOST=

# App
NEXTAUTH_SECRET=
NEXTAUTH_URL=
```

---

## Scripts

```bash
npm run dev          # local dev
npm run build        # production build
npm run prisma:generate   # regenerate both Prisma clients
```

---

## Deployment

Hosted on Vercel. Every push to `main` triggers a production deploy.

Project: `https://vercel.com/wugweb/memory`
Live URL: `https://memory-b3spkg6m5-wugweb.vercel.app`

All API routes use `export const dynamic = 'force-dynamic'` to prevent Turbopack static collection at build time.

---

*Identity Prism: The evolution of the second brain.*
