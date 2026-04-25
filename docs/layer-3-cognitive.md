# Layer 3: Cognitive Engine

The Cognitive Engine is the reasoning and decision core of Identity Prism OS. It converts memory (L1), signals (L2), and semantic meaning (L2.5) into structured decisions, grounded in the user's persona intelligence (L4). It reads from all lower layers. It never mutates them.

## Core Principle

Layer 3 = Logic Synthesizer + Decision Engine + Direction System.
Not a chatbot. Not a summariser. A decision proxy.

---

## Pipeline

Defined in `src/lib/cognitive/orchestrator.ts`:

```
Context Builder (L3.0)
  ↓
Prompt Builder
  ↓
LLM Reasoning Pass (gpt-4o-mini via LangChain)
  ↓
Sanitize (schema enforcement + output limits)
  ↓
Dedup (against last 3 decisions)
  ↓
Critic Gate (hallucination + generic advice + overconfidence checks)
  ↓
Log to Neon (decision_logs)
  ↓
Return to UI
```

---

## Context Builder (L3.0)

File: `src/lib/cognitive/contextBuilder.ts`

Pulls from all lower layers in a single parallel `Promise.all`:

| Source | Data | Layer |
|---|---|---|
| `mongo.entity` | Verified entities, occurrences, confidence | L2.5 |
| `mongo.relationship` | Verified entity relationships | L2.5 |
| `mongo.signal` | Recent signals, intensity, category | L2 |
| `postgres.decisionLog` | Last 3 decisions for dedup | L3 history |
| `PersonaResolver.resolve()` | Traits, preferences, style weights | L4 |

Rules: PROD-scoped only. Verified entities only. Graceful fallback if DB unavailable.

---

## Operating Modes

| Mode | Focus |
|---|---|
| `architect` | Systems, structure, long-term technical decisions |
| `founder` | Business outcomes, market fit, resource allocation |
| `operator` | Execution, immediate actions, blockers, daily momentum |

Mode is injected into the prompt via `src/lib/cognitive/mode/mode.ts`.

---

## API Endpoints

All endpoints are `force-dynamic`, strictly read-only on L1/L2/L2.5.

| Method | Path | Purpose | Input |
|---|---|---|---|
| POST | `/api/cognitive/decide` | Get direction (Flow 1) | `{ user_id, mode, external_input? }` |
| POST | `/api/cognitive/evaluate` | Evaluate JD/brief/idea (Flow 2) | `{ user_id, input_text, mode }` |
| POST | `/api/cognitive/gaps` | Gap analysis — deterministic (Flow 3) | `{ user_id }` |
| POST | `/api/cognitive/prioritize` | Rank items by signal alignment | `{ user_id, items: string[], mode }` |
| POST | `/api/cognitive/feedback` | Capture user feedback → L4 evolution | `{ decisionId, userId, feedbackType }` |
| GET  | `/api/cognitive/history` | Fetch decision registry with feedback | `?userId=&limit=` |

---

## Output Contracts

### `/decide`
```json
{
  "decision_id": "uuid",
  "recommendations": ["max 5, grounded in context"],
  "priorities": ["High: ...", "Medium: ...", "Low: ..."],
  "gaps": ["missing signal or entity"],
  "opportunities": ["cross-domain leverage"],
  "confidence": 0.0-1.0,
  "reasoning": "one sentence"
}
```

### `/evaluate`
```json
{
  "fit_score": 0.0-1.0,
  "verdict": "Strong Fit | Moderate Fit | Poor Fit",
  "why_yes": ["specific entity/signal overlap"],
  "why_no": ["specific gap"],
  "action_items": ["max 3 concrete steps"],
  "confidence": 0.0-1.0,
  "reasoning": "one sentence"
}
```

### `/gaps` (deterministic — no LLM)
```json
{
  "coverage_score": 0.0-1.0,
  "missing_domains": ["technical", "leadership", ...],
  "weak_entities": [{ "name": "...", "type": "...", "occurrences": 1 }],
  "missing_entity_types": ["person", "company", ...],
  "weak_signals": [{ "type": "...", "category": "...", "intensity": 0.1 }],
  "summary": "human-readable summary"
}
```

### `/prioritize`
```json
{
  "ranked": [
    { "item": "...", "rank": 1, "reason": "...", "signal_match": "entity/signal name" }
  ],
  "confidence": 0.0-1.0,
  "reasoning": "one sentence"
}
```

---

## Critic Gate (L3.6 — Phase 2)

File: `src/lib/cognitive/output/critic.ts`

Checks run in code before any output is returned:

| Check | Penalty | Blocks if |
|---|---|---|
| Ungrounded recommendations (>2 not tied to context) | −0.20 | issues ≥ 3 or confidence < 0.35 |
| Generic advice detected | −0.15 | same |
| Overconfident with thin signal data | −0.10 | same |

If critic does not approve, confidence is penalised and issues are prepended to `reasoning`. Output is still returned but clearly flagged.

---

## Deduplication

File: `src/lib/cognitive/dedup.ts`

Normalises all recommendations to lowercase and filters out any that exactly match a recommendation from the last 3 decision logs. Prevents the engine from giving the same advice twice.

---

## Sanitization

File: `src/lib/cognitive/sanitize.ts`

- Strips markdown fences from LLM output
- Enforces schema: all fields are arrays, confidence is `0–1`, max 5 items per list
- Throws `SCHEMA_VIOLATION` if JSON is unparseable

---

## Database Schema (Postgres / Neon)

Tables written to by L3:

| Table | Purpose |
|---|---|
| `decision_logs` | Every `/decide`, `/evaluate`, `/prioritize` run |
| `feedback_logs` | User accept/ignore/reject actions |
| `opportunity_evaluations` | Every `/evaluate` run (separate record) |

L3 never writes to: `memory_packets`, `entities`, `relationships`, `signals`, `patterns`, `topics`.

---

## Scheduled Invocations (L3.8)

Defined in `src/lib/memory/scheduler.ts`:

| Job | Schedule | Mode | Scope |
|---|---|---|---|
| Weekly direction reset | Monday 08:00 UTC | `architect` | All users with decision history |
| Daily momentum check | Daily 09:00 UTC | `operator` | Users active in last 7 days |

---

## L4 Integration

Every decision run includes the user's persona intelligence (traits, preferences, style weights) via `PersonaResolver.resolve()`. This shapes prompt tone and recommendation framing without being exposed in the output JSON.

Feedback submitted to `/api/cognitive/feedback` triggers `EvolutionEngine.evolve()` asynchronously via `waitUntil`, updating L4 models without blocking the response.

---

## Guardrails (Enforced in Code)

- L3 never writes to L1, L2, or L2.5
- All outputs are scoped to PROD — no test data in decisions
- Max 5 recommendations per run
- No generic advice (`be consistent`, `stay focused`, etc.) — detected and penalised by critic
- No unverified entities in context
- Confidence < 0.35 flags output as suspect
- Memory safety: `buildContext` is read-only in every code path

---

## Phase Status

| Phase | Status | Scope |
|---|---|---|
| Phase 1 — Core | ✅ Complete | Context builder, single LLM, sanitize, dedup, logging, `/decide` |
| Phase 2 — Harden | ✅ Complete | Critic gate, confidence penalty, langfuse tracing, feedback API |
| Phase 3 — Expand | ✅ Complete | `/evaluate`, `/gaps`, `/prioritize`, `opportunity_evaluations` table, scheduled crons |
| Phase 4 — Scale | 🕒 Pending | Multi-agent split, n8n orchestration, event-triggered decisions |
