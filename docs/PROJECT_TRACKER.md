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
| TSK-C16 | Langfuse observability tracing in orchestrator | L3 | ✅ |
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
| TSK-002 | n8n orchestration bridge — event-triggered cognitive runs | HIGH | L3 Phase 4 | 🕒 Pending |
| TSK-003 | Signal spike auto-trigger → cognitive run | MEDIUM | L3 Phase 4 | 🕒 Pending |
| TSK-004 | External tool integration (Calendar / Tasks) | MEDIUM | L3 | 🕒 Pending |
| TSK-005 | Semantic dedup — embedding cosine similarity (upgrade from substring) | MEDIUM | L3 Phase 2 upgrade | 🕒 Pending |
| TSK-006 | Multi-modal signal extraction (audio/video) | LOW | L2 | 🕒 Backlog |
| TSK-007 | Cost routing — gpt-4o for complex, gpt-4o-mini for simple | LOW | L3 Phase 4 | 🕒 Backlog |

---

*Last updated: April 2026*
