# Identity Prism OS — Project Tracker

Primary tracking document for bugs, architectural resolutions, and pending work.

---

## Bug Fixes

| ID | Issue | Resolution | Status |
|---|---|---|---|
| BUG-001 | Cross-environment data leakage | Enforced mandatory `test_run_id` across all 15+ models and read paths | ✅ Fixed |
| BUG-002 | Partial write graph corruption | Implemented `pending → complete` state transition for atomic semantic digestion | ✅ Fixed |
| BUG-003 | Unique constraint race conditions | Integrated `isUniqueError` handling and `dedup_hash` logic for idempotent upserts | ✅ Fixed |
| BUG-004 | Vector search leak | Added `$vectorSearch` filter mandatory propagation for `test_run_id` | ✅ Fixed |
| BUG-005 | Topic model isolation gap | Added `processing_state` and `test_run_id` to `Topic` model and API routes | ✅ Fixed |
| BUG-006 | Vercel build failure (Next.js) | Corrected version to stable `14.1.0` in `package.json` | ✅ Fixed |
| BUG-007 | Vercel build failure (CSS) | Defined `border` and `bg` color groups in `tailwind.config.ts` | ✅ Fixed |
| BUG-008 | RAG/OpenAI desync | Unified `openai.ts` namespace with Layer 2.5 hardened schema | ✅ Fixed |
| BUG-009 | `contextBuilder.ts` `intelligence` not destructured | `intelligence` was declared as 5th Promise.all arg but not included in destructure array — caused runtime crash on every cognitive run | ✅ Fixed |
| BUG-010 | Vercel build rejected ("Deployment failed" on `0b4da3f`) | `*/5` cron is not allowed on Hobby → Vercel crons are daily; the 5-min pipeline trigger runs from GitHub Actions (`memory-pipeline.yml`). No Vercel Pro (owner rule) | ✅ Fixed 2026-11-18 |
| BUG-011 | Job routes unauthenticated for crons (401) | `CRON_SECRET` set in Vercel production, matching `JOB_SECRET` GitHub secret | ✅ Fixed 2026-11-18 |
| BUG-012 | `/api/health/system` + `/api/semantic/graph` P2022 (`entities.processing_state` missing) | `Entity` remapped to its own `graph_entities` table (the name `entities` collided in the shared Neon DB); the 15 columns wrongly added to `entities` were dropped by guarded migration `20261118160000` | ✅ Fixed 2026-11-18 |
| BUG-013 | L1/L2/L2.5 pipeline dead (46 packets stuck `pending`) | `node-cron` replaced by `/api/jobs/process`; first live run embedded 20 / completed 30 / 20 semantic; now draining every 5 min | ✅ Fixed 2026-11-18 |
| BUG-014 | `api-map.test.ts` failing (9 routes undocumented) | Added csv/docx/device ingest, jobs/process, sources, oauth/google, webhooks/email to `src/lib/api/endpoints.ts`; suite 51/51 | ✅ Fixed 2026-11-18 |
| BUG-015 | `scripts/scan-secrets.sh` silently passed without `rg` | `git grep` fallback, Postgres/Neon patterns, hard-fail if no scanner | ✅ Fixed 2026-11-18 |
| BUG-016 | CodeQL alerts (SSRF, format string, HTML strip, rate-limit) | Live ones fixed (repeat-until-stable HTML strip, constant log format, orphaned SSRF files removed); 10 stale alerts for deleted files dismissed | ✅ Fixed 2026-11-18 |
| BUG-017 | `@vercel/sandbox` unused but pinned to `latest` (4 high vulns) | Removed on `fix/remove-unused-sandbox` (npm audit 45 → 41) | 🔄 On branch, pending merge |

---

## Architectural Resolutions

| ID | Challenge | Solution | Status |
|---|---|---|---|
| RES-001 | No MongoDB transactions | Application-level atomicity via state flip (`pending → complete`) | ✅ Resolved |
| RES-002 | Test data cleanup | Native `cleanup_test_data.cjs` script for environment purging | ✅ Resolved |
| RES-003 | System integrity validation | 20-point Diagnostic Audit API + standalone certification script | ✅ Resolved |
| RES-004 | Documentation drift | Synced README, layer docs, and Project Tracker with production state | ✅ Resolved |
| RES-005 | L3 architecture drift | Unified all cognitive routes to use `processDecision` orchestrator. `/evaluate`, `/gaps`, `/prioritize` all use `buildContext` → LLM → `logDecisionNeon` pipeline | ✅ Resolved |
| RES-006 | Feedback loop not wired | `/api/cognitive/feedback` captures accept/ignore/reject, triggers `EvolutionEngine.evolve()` async via `waitUntil` | ✅ Resolved |

---

## Completed Tasks

| ID | Task | Layer | Completed |
|---|---|---|---|
| TSK-C01 | Context Builder — parallel Promise.all with all 5 data sources | L3 | ✅ |
| TSK-C02 | Orchestrator pipeline — Context→Prompt→LLM→Sanitize→Dedup→Critic→Log | L3 | ✅ |
| TSK-C03 | Critic gate — grounding, generic advice, overconfidence checks | L3 | ✅ |
| TSK-C04 | Deduplication — normalised string match against last 3 decisions | L3 | ✅ |
| TSK-C05 | `/cognitive/decide` — unified endpoint via `processDecision` | L3 | ✅ |
| TSK-C06 | `/cognitive/evaluate` — JD/brief/idea fit scoring | L3 | ✅ |
| TSK-C07 | `/cognitive/gaps` — deterministic coverage analysis, no LLM | L3 | ✅ |
| TSK-C08 | `/cognitive/prioritize` — signal-aligned item ranking | L3 | ✅ |
| TSK-C09 | `/cognitive/feedback` — captures feedback, triggers L4 evolution | L3/L4 | ✅ |
| TSK-C10 | `/cognitive/history` — decision registry with feedback aggregation | L3 | ✅ |
| TSK-C11 | `decision_logs` table — Postgres (Neon) | L3 | ✅ |
| TSK-C12 | `feedback_logs` table — Postgres (Neon) | L3 | ✅ |
| TSK-C13 | `opportunity_evaluations` table — Postgres (Neon) | L3 | ✅ |
| TSK-C14 | Scheduled weekly cognitive reset (Monday 08:00 UTC, architect mode) | L3 | ✅ |
| TSK-C15 | Scheduled daily momentum check (09:00 UTC, operator mode) | L3 | ✅ |
| TSK-C16 | Observability facade in orchestrator (Langfuse is an intentional no-op — owner decision) | L3 | ✅ |
| TSK-C17 | Mode engine (architect / founder / operator) | L3 | ✅ |
| TSK-C18 | Prompt builder with mode instruction + L4 intelligence injection | L3 | ✅ |
| TSK-C19 | Sidebar navigation — 11 sections, human-readable labels | UI | ✅ |
| TSK-C20 | TopNav — breadcrumb, command palette (⌘K), all 11 sections + 5 quick actions | UI | ✅ |
| TSK-C21 | Memory Vault upload — drag-drop → POST /api/upload → progress → list | UI/L1 | ✅ |

---

## Pending Tasks

| ID | Task | Priority | Layer | Status |
|---|---|---|---|---|
| TSK-001 | Multi-agent split (Retriever → Reasoner → Critic → Formatter) | HIGH | L3 Phase 4 | 🕒 Pending |
| TSK-002 | Internal orchestration bridge — event-triggered cognitive runs (no n8n) | HIGH | L3 Phase 4 | 🕒 Pending |
| TSK-003 | Signal spike auto-trigger → cognitive run | MEDIUM | L3 Phase 4 | 🕒 Pending |
| TSK-004 | External tool integration (Calendar / Tasks) | MEDIUM | L3 | 🕒 Pending |
| TSK-005 | Semantic dedup — embedding cosine similarity (upgrade from substring) | MEDIUM | L3 Phase 2 upgrade | 🕒 Pending |
| TSK-006 | Multi-modal signal extraction (audio/video) | LOW | L2 | 🕒 Backlog |
| TSK-007 | Cost routing — gpt-4o for complex, gpt-4o-mini for simple | LOW | L3 Phase 4 | 🕒 Backlog |
| TSK-008 | Remaining ~41 npm vulnerabilities: need major bumps (prisma 7, tailwind 4); mostly CLI/build tooling, several suggested "fixes" are downgrades | LOW | Security | 🕒 Deferred |
| TSK-009 | Decide auto-promotion vs manual promote on Vercel (manual currently blocks bad builds going live) | MEDIUM | Deploy | 🕒 Owner decision |

---

---

## Audit note — 2026-06-25

Full cross-check of the April–May audit docs against the live tree: every BUG-/BLOCKER-/HIGH
item listed in those audits is fixed in code. Verified via clean `next build`, `tsc --noEmit`,
`eslint`, zero TODO/FIXME markers, and no runtime errors in the prior 7 days. The point-in-time
audit snapshots were moved to [`archive/`](./archive/) to stop them reading as open issues.
Forward-looking work is consolidated in [`PENDING.md`](./PENDING.md) and
[`master-roadmap.md`](./master-roadmap.md).

*Last updated: 2026-11-18*
