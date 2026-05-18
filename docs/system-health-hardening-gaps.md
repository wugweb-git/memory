# System Health: Hardening & Gaps

## BLOCKERS (runtime failures)

| # | File | Issue | Fix |
|---|---|---|---|
| 1 | `src/app/page.tsx` | Hardcoded user identity `"Vedanshu Srivastava"`, `"@vedanshu"`, `"vedanshu@wugweb.com"`; mock stats `"4.2k"`, `"Active"`, `"3"`, `"98.4%"`; hardcoded GitHub/LinkedIn URLs | Wire to identity config + DB-backed profile |

## HIGH (runtime quality)

| # | File | Issue | Fix |
|---|---|---|---|
| 2 | `src/jobs/*` | 7 of 10 job files are stubs returning `{ ok: true }`: retry-worker, scheduled-publisher, analytics-sync, engagement-fetcher, recommendation-rescore, publishing-queue, stale-draft-cleanup | Add real orchestration or mark explicitly as L5 backlog |
| 3 | `src/lib/twin/*` | All 4 files (simulation, scenarios, forecast, drift) are stubs | Implement or accept as L5 future scope |
| 4 | `src/lib/provenance/*` | All 4 files exist but detection.ts is incomplete (just interface) | Fill detection logic |
| 5 | `src/lib/adaptive-ui/` | prediction.ts, context.ts are empty stubs | Implement or accept as L5 future scope |
| 6 | `src/app/api/admin/*/route.ts` | ~50% are stubs (model-health, output-health, provenance-health, publishing-health, recommendation-health) | Wire real DB queries |
| 7 | All routes | Generic 500 on errors; no 400/404/422 distinction | Add status code branching |

## MEDIUM (UI quality)

| # | File | Issue |
|---|---|---|
| 8 | `src/app/page.tsx` | No error boundaries for async sections; no loading skeletons |
| 9 | `src/app/cognitive/page.tsx` | Partial loading (has states per section but no global fallback) |
| 10 | `src/app/persona/page.tsx` | sendFeedback/updateAdaptive lack catch blocks |
| 11 | `src/app/admin/*/page.tsx` | admin/memory, admin/profile pages are minimal stubs |
| 12 | `src/app/buffer/page.tsx`, `ask/page.tsx`, `content/page.tsx`, `history/page.tsx` | Minimal content, mostly layout shells |

## SUMMARY STATS

| Category | Count | Real | Stub/Placeholder | Hardcoded |
|---|---|---|---|---|
| Screens (page.tsx) | 14 | 8 | 5 | 1 |
| API routes | 40+ | ~28 | ~12 | 0 |
| Library modules | ~55 | ~35 | ~18 | 0 |
| Jobs | 10 | 3 | 7 | 0 |
| Docs | ~60 | ~55 | ~5 | 0 |

## TOP 5 FIXES (quickest impact)

1. **Page.tsx**: Swap hardcoded identity to config-driven values
2. **Admin health routes**: Wire all 5 placeholder routes to real DB queries (pattern: persona-health)
3. **Error status codes**: Add 400/404 branches to all routes
4. **Page error boundaries**: Add React error boundaries to page.tsx sections
5. **Trade lib stubs**: Either implement or add clear `/* L5 BACKLOG */` comments