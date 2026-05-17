# Layer 4 — Production Audit Report
**Date:** 2026-05-18
**Scope:** All Layer 4 persona/behavioral/bio files, API routes, UI pages, jobs, tests

## 🔴 BLOCKERS (will fail at runtime)

| # | File | Line | Issue | Fix |
|---|---|---|---|---|
| 1 | `src/lib/persona/types.ts` | 1 | `w/**` typo — invalid JS comment start, will cause parse error | Remove leading `w` |
| 2 | `src/lib/persona/extractor.ts` | 73, 85, 98 | `postgres.communicationPattern` — Prisma model is `communicationPatterns` (plural) | Change to `postgres.communicationPatterns` |
| 3 | `src/lib/persona/behavior.ts` | 7 | `import from "../../generated/postgres"` — wrong path, should be `@/generated/postgres` | Fix import |
| 4 | `src/lib/output/generator.ts` | 66 | `persistFingerprint` called but the style vector is accessed as `fingerprint.styleVector?.[...]` — the return type is `void` | Fix return type or refactor |

## 🟡 HIGH (runtime reliability)

| # | File | Issue | Fix |
|---|---|---|---|
| 5 | `src/lib/persona/extractor.ts` | Creates duplicate `communicationPatterns` rows on every extraction (no dedup) | Upsert or check existence first |
| 6 | `src/app/api/persona/adaptive-ui/route.ts` | PATCH route uses `postgres.adaptiveUxProfile.update` instead of the library `updateAdaptiveUiProfile` | Use library function |
| 7 | `src/app/api/persona/drift/route.ts` | Uses `IDENTITY_CONFIG.DEFAULT_USER_ID` only, never reads query param `userId` | Add userId from query param |
| 8 | `src/app/api/persona/rebuild/route.ts` | No delete cascade — deletes profile but leaves orphaned traits/fingerprints/logs | Delete in proper order or cascade |
| 9 | `src/app/api/persona/feedback/route.ts` | No feedback_type validation — accepts any string instead of `accepted/rejected/ignored` | Add enum validation |
| 10 | `src/app/api/persona/profile/route.ts` | Returns 200 with `{ confidenceScore: 0.5 }` instead of a proper 404 when profile doesn't exist | Distinguish 404 vs 500 |

## 🟠 MEDIUM (UI/UX quality)

| # | File | Issue |
|---|---|---|
| 11 | `src/app/persona/page.tsx` | No error boundaries — one failed API fetch crashes the whole panel |
| 12 | `src/app/persona/page.tsx` | No loading skeleton for evolution timeline |
| 13 | `src/app/persona/page.tsx` | Adaptive UX PATCH has no optimistic update — UI freezes until response |
| 14 | `docs/CHANGELOG_LAYER4.md` | Lacks entry for 3 job implementations and health route fix |

## 🟢 FIXED THIS SESSION

| # | File | Issue | Status |
|---|---|---|---|
| A | `src/jobs/persona-evolution.ts` | Was stub → real logic | ✅ |
| B | `src/jobs/fingerprint-validation.ts` | Was stub → real logic | ✅ |
| C | `src/jobs/behavioral-reconciliation.ts` | Was stub → real logic | ✅ |
| D | `src/app/api/admin/persona-health/route.ts` | Placeholder → real DB queries | ✅ |
| E | `src/config/identity.ts` | Created central identity | ✅ (previous session) |

## Build Status
- Last build: **Compiled successfully in 6.5s** — 36/36 static pages
- No TypeScript errors detected at compile time (many issues are runtime-only)