# CLAUDE.md — Identity Prism OS

A personal **cognitive operating system** (not a dashboard): observe → understand → decide → act. Layered architecture; single-owner.

## Architecture (layers — ALL on Neon/Postgres since 2026-07)
```
L0 Blob (intake buffer) → L1 Memory (+ pgvector RAG)
L2 Signals → L2.5 Semantic graph
L3 Cognitive "brain" → L4 Persona → L5 Execution/publish
```
One-line truth: **L1=memory · L2=signals · L2.5=meaning · L3=thinking · L4=who you're becoming.**
Layer boundaries are enforced by code modules (layer contracts), not by separate databases.

## Tech stack
- **Next.js 15 App Router, React 18, TypeScript, Tailwind.** Deployed on **Vercel** (every push to `main` = prod deploy → `memory-git-main-wugweb.vercel.app`).
- **One database, one Prisma client:** `import { postgres } from '@/lib/db/postgres'`
  (schema `prisma/postgres/schema.prisma`, generated `src/generated/postgres`; `npm run prisma:generate`).
  Embeddings use **pgvector** (`vector(1536)` + HNSW cosine index; written/queried via `$queryRaw` — Prisma can't bind `Unsupported` columns).
  MongoDB was removed 2026-07 (Atlas cluster retained as a cold archive only; `mongoose` dep belongs to the dormant legacy Express layer).
- LangChain + OpenAI embeddings, Gemini cognitive LLM, **Langfuse** observability, **Sanity** (public showcase CMS), Vercel Blob.

## Key directories
- `src/app/**` routes · `src/app/component/**` shared UI · `src/app/api/**` route handlers
- `src/lib/cognitive/**` L3 brain (orchestrator `processDecision`, agents, routing, critic, logging)
- `src/lib/processing/**` L2 signals · `src/lib/memory/**` L1 + RAG · `src/lib/ingestion/**` L0 connectors
- `src/lib/cms/**` Sanity (client, queries, schemas) · `src/lib/output/**` L5 publish
- `src/config/identity.ts` owner identity · `src/config/ui-content.ts` nav config

## The brain (L3)
Pipeline (`src/lib/cognitive/orchestrator.ts`): `buildContext → buildPrompt → LLM → sanitize → dedup → critic → logDecisionNeon`, Langfuse-traced. Routes: `/api/cognitive/{decide,evaluate,gaps,prioritize,feedback,history,traces}`. Reads L1–L2.5, writes decision logs, **never mutates lower layers**. Modes: architect/founder/operator.
- **Phase 4 is opt-in** via env: `COGNITIVE_MULTI_AGENT=1` (reasoner→decision split), `COGNITIVE_MODEL_FLOOR=mini`, `COGNITIVE_SIGNAL_TRIGGER=1` (signal-spike → cognitive run). Default = verified single-pass.

## Design system (light-first)
- **Light theme, token-driven.** Colors/spacing/type from CSS vars in `src/app/globals.css`, exposed to Tailwind in `tailwind.config.ts` (`bg-bg-*`, `text-text-*`, `border-border-*`, `--accent`, semantic `success/danger/warning`). **No hardcoded hex/zinc/black in components.**
- **Type:** one fluid named scale `2xs→5xl` (no arbitrary `text-[Npx]`; 11px floor). Headings sentence-case, **no italics, no all-caps** (small uppercase eyebrow labels are the one exception).
- **Shell:** one route-aware `src/app/component/AppShell.tsx` (sidebar + topbar + mobile drawer + bottom dock) wraps every internal route. Public profile `/p/*` is the only surface outside it.
- See `docs/design.md`.

## Env vars (live in Vercel; `vercel env pull .env.local` for local)
`brain_POSTGRES_PRISMA_URL` + `brain_POSTGRES_URL_NON_POOLING` (Neon; no plain DATABASE_URL), `OPENAI_API_KEY` (embeddings), `GEMINI_API_KEY` (cognitive LLM; optional `GEMINI_MODEL`, default `gemini-2.0-flash`), `LANGFUSE_PUBLIC_KEY/SECRET_KEY/HOST`, `BLOB_READ_WRITE_TOKEN`, `SANITY_PROJECT_ID`/`SANITY_DATASET`/`SANITY_API_TOKEN`, `AUTH_SECRET`, `ADMIN_EMAIL`/`ADMIN_PASSWORD` (owner login).

## Commands & verification
- `npm run dev` · `npm run build` · `npx tsc --noEmit` · `npm run lint`
- Prefer the **preview_*** tools (not Bash) to run the dev server + screenshot.
- ⚠️ **Do NOT run `npm run build` while `next dev` is running** — it corrupts `.next` (rm -rf .next + restart if it happens).

## Gotchas
- Local `.env.local` may be **dummy** — data-backed pages show loading/error states; layout still renders.
- **No embedded Sanity Studio** (it needs React 19; app is React 18). Studio is standalone (`sanity.config.ts` at root → `npx sanity dev`) or hosted. App uses `@sanity/client`/`next-sanity` for reads/writes only.
- Routes reading request data set `export const dynamic = 'force-dynamic'`.
- Sanity showcase falls back to the internal profile API when unconfigured (`sanityEnabled`).
