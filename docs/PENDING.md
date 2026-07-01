# Pending / follow-up

> **HANDOFF — start the next session here.** Pillars 1/2/3 + design are merged to `main`
> and deployed to prod (`memory-wugweb.vercel.app`). Code is build-green. End-to-end prod
> verification (2026-06-30) found **two real prod blockers** the brain/memory can't run
> without. Full context: [`../CLAUDE.md`](../CLAUDE.md) + `CLAUDE.local.md` (gitignored).

## 🔴 P0 — Prod blockers (verified failing in prod)

1. **MongoDB SRV DNS broken everywhere.** `MONGODB_URI` uses `mongodb+srv://`; the SRV
   lookup gets a search-domain suffix appended and fails — on Vercel
   (`cluster0.qstcdiz.mongodb.net.ec2.internal`) **and** locally (`.local`). Every
   Mongo-backed layer (L0 blob, L1 memory, L2 signals, L2.5 semantic, all `/api/ingest/*`,
   `/buffer`, `/memory`) 500s.
   **Fix:** replace `MONGODB_URI` in Vercel (all environments) with the **non-SRV standard**
   connection string from Atlas (`mongodb://host1:27017,host2,host3/db?replicaSet=…&ssl=true&authSource=admin`),
   then redeploy. (Atlas → Connect → Drivers → older driver version shows the non-SRV string.)

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
   verified live). Deploy the schema there for Studio editing: `npx sanity schema deploy`
   (config reads `SANITY_STUDIO_PROJECT_ID`). Note: an earlier MCP deploy went to the wrong
   project `splvhmk1` (different Sanity account) — ignore it.
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
- [ ] Distributed rate-limit store (Redis/Upstash) — currently an in-memory map
- [ ] Global authz middleware enforcement across all privileged APIs
- [ ] RBAC checks on every publish/admin path (partial today)
- [ ] Signed-webhook enforcement everywhere (primitive exists, not global)
- [ ] Encryption-at-rest policy + validation

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
- [ ] Retry-worker / dead-letter wired end-to-end (job handlers are thin but functional)
- [ ] Duplicate-publish prevention (idempotency keys)
- [ ] Backup/restore runbooks, migration rollback drills, queue replay tooling

## Data & DB hardening
- [ ] Mongo retention / archival / compression lifecycle
- [ ] Postgres partitioning strategy for high-volume execution/provenance logs

## Testing
- [ ] Load, provenance, publishing, persona-evolution, rollback, replay, hallucination suites

## Expansion
- [ ] Ingestion connectors (RSS / email / webhook / article)
- [ ] Multi-tenant / org boundaries + agent arbitration & permissions

## Code cleanup (low-risk)
- [ ] Remove unused deps: `multer`, `react-router-dom`, `pdf2json`, `pdfreader`, `pdfjs-dist`
- [ ] Legacy Express layer removal per [`legacy-api.md`](./legacy-api.md) — audit callers first
- [ ] OAuth callbacks for Behance/Dribbble when credentials are available
