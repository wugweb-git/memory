# Pending / follow-up

_Last reviewed: 2026-06-25._

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
- [ ] n8n orchestration bridge — event-triggered cognitive runs
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
