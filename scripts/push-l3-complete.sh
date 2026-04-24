#!/bin/bash
set -e
cd /Users/abcom/Documents/GitHub/memory

git add -A

git commit -m "feat(l3-complete): evaluate, gaps, prioritize routes + schema + scheduled triggers

MISSING API ROUTES — NOW ADDED:
- src/app/api/cognitive/evaluate/route.ts
  POST /api/cognitive/evaluate
  L3 Opportunity Engine (Flow 2). Evaluates JD/brief/idea vs memory context.
  Returns: fit_score, verdict, why_yes, why_no, action_items, confidence.
  Confidence gate: < 0.4 forces verdict to 'Poor Fit'.
  Stores every run in decision_logs. Strictly read-only on L1/L2.

- src/app/api/cognitive/gaps/route.ts
  POST /api/cognitive/gaps
  L3 Gap Engine (Flow 3). Deterministic — no LLM.
  Compares active context vs 6 expected domains + 4 entity types.
  Returns: coverage_score, missing_domains, weak_entities,
           missing_entity_types, weak_signals, summary.

- src/app/api/cognitive/prioritize/route.ts
  POST /api/cognitive/prioritize
  L3 Prioritization Engine. Rank_Actions(items[], signals) from spec.
  Input: { user_id, items: string[], mode }
  Output: { ranked: [{item, rank, reason, signal_match}], confidence, reasoning }
  Max 10 input items. Stores to decision_logs.

DB SCHEMA:
- prisma/postgres/schema.prisma: added OpportunityEvaluation model
  Fields: id, userId, inputText, evaluationJson, fitScore, mode, createdAt
  Table: opportunity_evaluations
  Index: [userId, createdAt]

SCHEDULER — L3 INVOCATIONS:
- src/lib/memory/scheduler.ts: added cron jobs 4 + 5
  Job 4: Weekly Direction Reset (Monday 8am UTC)
    Mode: architect, All users with decision history
    Spec: L3.8 Invocation System — scheduled mode
  Job 5: Daily Momentum Check (9am UTC daily)
    Mode: operator, Active-only (last 7 days)
    Uses dynamic import to avoid circular deps

SPEC COMPLIANCE CHECKLIST:
  [x] POST /cognitive/decide         — existed
  [x] POST /cognitive/feedback       — existed
  [x] POST /cognitive/history        — existed
  [x] POST /cognitive/evaluate       — ADDED
  [x] POST /cognitive/gaps           — ADDED
  [x] POST /cognitive/prioritize     — ADDED
  [x] opportunity_evaluations table  — ADDED to schema
  [x] decision_logs table            — existed
  [x] feedback_logs table            — existed
  [x] Scheduled weekly (Monday 8am)  — ADDED
  [x] Scheduled daily (9am)          — ADDED
  [x] Context Builder (L3.0)         — existed
  [x] Critic gate (L3.6 Phase 2)     — existed
  [x] Dedup                          — existed
  [x] Mode engine                    — existed
  [x] Sanitize                       — existed
  [x] Neon logger                    — existed
  [x] Orchestrator pipeline          — existed
  [x] Memory safety (read-only)      — enforced in all new routes"

git push
echo "✅ All Layer 3 spec items implemented and pushed."
