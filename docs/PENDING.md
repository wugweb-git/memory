# Pending / follow-up

> **HANDOFF — start the next session here.** Pillars 1/2/3 + design are merged to `main`
> and deployed to prod (`memory-wugweb.vercel.app`). Code is build-green. End-to-end prod
> verification (2026-06-30) found **two real prod blockers** the brain/memory can't run
> without. Full context: [`../CLAUDE.md`](../CLAUDE.md) + `CLAUDE.local.md` (gitignored).

## 🔴 P0 — Prod blockers (verified failing in prod)

1. ~~**MongoDB SRV DNS broken everywhere.**~~ **RESOLVED by removal (2026-07-04):** MongoDB was
   dropped entirely — all 20 L0–L2.5 models migrated to Neon (pgvector for embeddings). The Atlas
   cluster is retained untouched as a **cold archive** only (old data recoverable via the non-SRV
   connection string if ever needed). `MONGODB_URI` can be deleted from Vercel env.

2. **OpenAI quota exceeded (429).** `/api/cognitive/decide` runs end-to-end (the Neon fix
   works) but the LLM call returns `429 You exceeded your current quota`.
   **Fix:** add billing/credits to the OpenAI account, **or** switch the cognitive LLM to
   Gemini (`Gemini_API_Key` is already in env) in `src/lib/cognitive/llm.ts`.

3. **Confirm `brain_*` Neon vars exist for the Production environment.** The code now reads
   `brain_POSTGRES_PRISMA_URL` / `brain_POSTGRES_URL_NON_POOLING` (fixed — verified on the
   *development* env: `/api/cognitive/history` → 200 `[]`). Prod `/api/cognitive/history`
   returned 500, which suggests those vars may only be set for Dev/Preview, not Production.
   **Fix:** Vercel → memory → Settings → Env Vars → ensure both exist for **Production**.

## 🟡 P1 — Finish the pillars (after P0)

4. **Sanity schema → correct project.** App reads `4d6jaglm`/production (reads + write token
   verified live) — in-app CMS management (`/portfolio`) reads/writes fine without this; it
   only affects the standalone Sanity Studio's editing UI (which we don't embed — needs React
   19). Note: an earlier MCP deploy went to the wrong project `splvhmk1` (different Sanity
   account) — ignore it.
   **Attempted 2026-07-05:** `npx sanity schemas deploy` fails in the main repo (React 18) with
   `"./compiler-runtime" is not exported` — the schema-deploy manifest builder needs React 19,
   same constraint as embedding Studio. Worked around by running the deploy from an isolated
   temp env with React 19 (`sanity.cli.ts` in repo root has the project/dataset config) — got
   past the build step, then hit `Unauthorized — missing grant sanity.project/deployStudio`.
   **`SANITY_API_WRITE_TOKEN` is Editor-scoped (content writes only); deploying schemas needs
   an Administrator-scoped token.** To finish: generate an Administrator API token at
   manage.sanity.io → project `4d6jaglm` → API → Tokens, set it as `SANITY_AUTH_TOKEN`, then
   re-run the isolated-env deploy (or `npx sanity login` interactively).
5. **Re-run end-to-end** once Mongo + OpenAI are fixed: `/api/ingest/article` → blob →
   promote → memory packet; `/api/cognitive/decide` → real decision + Neon `decision_logs` row.

## 🟢 P2 — Hardening / known gaps

6. **Security:** `/api/ingest/*` and `/api/cognitive/*` are unauthenticated POST endpoints
   (anyone can write to L0 / trigger LLM spend). Add auth + rate-limit before real use.
7. **Langfuse** is a no-op facade (`src/lib/observability/langfuse.ts`); only
   `LANGFUSE_SECRET_KEY` is in env (no PUBLIC_KEY/HOST). Wire real tracing + add keys.
8. **Phase 4 (built, untested live):** after the brain works, flip `COGNITIVE_MULTI_AGENT=1`
   and `COGNITIVE_SIGNAL_TRIGGER=1` and verify the reasoner→decision split + signal trigger.
9. **Ingestion connectors store the POSTed payload only** — no real article-HTML/email/RSS
   fetching/parsing yet. Wire real fetchers directly (no n8n).
10. **Home SPA sections not extracted to routes** (profile/twin/showcase/activity/settings);
    Console links to existing routes only.
11. Minor: `/buffer` h1 still uppercase ("BUFFER CONTROL SURFACE") vs the no-uppercase rule.
12. **34 GitHub dependabot vulns**; unused deps (`multer`, `react-router-dom`, `pdf2json`,
    `pdfreader`, `pdfjs-dist`); dormant legacy Express layer (`api/index.js`, `src/server.js`).

---

_Earlier backlog (pre-2026-06-30):_

The April–May audit backlog (component restoration, auth, health routes, broken links,
ESLint) is **complete** — see the archived snapshots in [`archive/`](./archive/). Build,
typecheck, lint, and runtime are all green.

What remains below is **unbuilt future scope**, not bugs. Execution order and acceptance
criteria live in [`master-roadmap.md`](./master-roadmap.md).

## Security hardening
- [x] Distributed rate-limit store — counters in Neon (`rate_limit_counters`, atomic upsert), fails open (2026-07)
- [x] Authz middleware on admin paths — Edge-safe JWT middleware, header spoofing closed (2026-07)
- [x] RBAC on publish/admin/ingest/cognitive/upload paths — `requireOwner` + `hasPermission` (2026-07)
- [ ] Signed-webhook enforcement everywhere (primitive exists, not global)
- [ ] Encryption-at-rest policy + validation (Neon encrypts at rest by default; app-level policy doc pending)

## Performance & cost
- [ ] Cache invalidation orchestration + hit-rate metrics (cache primitives exist)
- [ ] Token-usage tracking + per-workflow cost accounting (primitives exist)
- [ ] Budget enforcement / fallback routing by cost-quality

## Cognitive (L3 Phase 4)
- [ ] Multi-agent split (Retriever → Reasoner → Critic → Formatter)
- [ ] Internal orchestration bridge — event-triggered cognitive runs (no n8n)
- [ ] Signal-spike auto-trigger → cognitive run
- [ ] Semantic dedup via embedding cosine similarity (upgrade from substring match)

## Provenance / governance
- [ ] Immutable provenance ledger + signed lineage records
- [ ] Recommendation confidence + hallucination audit hooks
- [ ] Persona checkpoint/rollback + anomaly guards; twin contradiction alerts

## Execution (L5) & DR
- [x] Retry-worker / dead-letter wired end-to-end — claim → backoff (2^n) → `dead` after 5 (2026-07)
- [x] Duplicate-publish prevention — `publishOutput` idempotency on `published_outputs.outputId` (2026-07)
- [ ] Backup/restore runbooks, migration rollback drills, queue replay tooling

## Data & DB hardening
- [x] ~~Mongo retention lifecycle~~ — obsolete: Mongo removed; Neon retention-cleanup job runs in `/api/jobs/run` (2026-07)
- [~] Postgres partitioning — **deliberately deferred** (2026-07-07): log tables hold near-zero rows;
      the retention job caps growth; native partitioning would require table recreation for no
      current benefit. Revisit when `execution_audit_logs` exceeds ~5M rows.

## Testing
- [x] Load smoke suite — `node scripts/load-test.mjs [base] [conc] [n]`: p50/p95/p99 + error-rate gate (2026-07)
- [x] Acceptance tests (fetchers, recommendation primitives, flags, router) — 51 passing in `npm test`
- [ ] Provenance / persona-evolution / rollback / replay / hallucination suites

## Expansion
- [x] Ingestion connectors — article (real fetch+extract), RSS/Atom (fetch+parse), Notion (token
      integration, `/api/ingest/notion`), upload (PDF via unpdf), voice, pulse (2026-07).
      Email remains payload-only until an inbound provider is chosen.
- [~] Multi-tenant / org boundaries — **deliberately deferred** (2026-07-07): the product is
      single-owner by design (see CLAUDE.md); tenancy contradicts the MVP. Requires an explicit
      product decision before any work.

## Code cleanup (low-risk)
- [x] Unused deps removed (multer, react-router-dom, pdf2json, pdfreader, pdfjs-dist, workflow,
      express, mongoose, supertest, pdf-parse) (2026-07)
- [x] Legacy Express layer retired after full reference audit — zero live imports; broken root
      `api/*.js` functions removed from prod (2026-07-07, see `legacy-api.md`)
- [ ] OAuth callbacks for Behance/Dribbble — **blocked on owner**: needs app registrations
      (client id/secret) on both platforms; env contract ready when credentials exist
