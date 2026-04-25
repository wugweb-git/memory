#!/bin/bash
set -e
cd /Users/abcom/Documents/GitHub/memory

git add -A

git commit -m "fix+docs: contextBuilder intelligence bug, full doc update

BUG FIX:
- src/lib/cognitive/contextBuilder.ts
  intelligence was declared as the 5th element in Promise.all but was
  NOT included in the destructure array [entities, relationships, signals,
  recentDecisions]. This caused a runtime ReferenceError on every cognitive
  decision call. Fixed by adding intelligence to the destructure.
  Also added .catch() graceful fallback on PersonaResolver.resolve() so
  if L4 is not yet ready the rest of the context still assembles.

DOCS:
- docs/layer-3-cognitive.md — full rewrite
  - Context Builder table (all 5 sources)
  - Complete API endpoint table with input/output contracts
  - Critic gate rules and penalty table
  - DB schema table (what L3 writes, what it never touches)
  - Scheduled invocations (weekly + daily cron)
  - Phase status table (1+2+3 complete, 4 pending)
  - Guardrails section

- docs/PROJECT_TRACKER.md — full rewrite
  - Added BUG-009 (contextBuilder intelligence destructure)
  - Added RES-005, RES-006 for L3 architecture resolutions
  - Added 21 completed tasks (TSK-C01 through TSK-C21)
  - Updated pending tasks with correct priority and phase mapping

- README.md — full rewrite
  - System philosophy table (L0-L4)
  - Tech stack table
  - L3 endpoints table + pipeline diagram
  - Prisma dual-client setup (mongo + postgres)
  - Environment variables
  - Deployment info"

git push
echo "✅ Bug fixed and all docs updated."
