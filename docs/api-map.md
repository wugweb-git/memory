# API Map
Core APIs: cognitive, output, memory, processing, persona, admin health.

Source of truth: `src/lib/api/endpoints.ts` (checked by `test/**/api-map.test.ts`). Daily `GET/POST /api/jobs/run` also runs behavioural reconciliation, persona-evolution and fingerprint-validation (each in `safeJob`, skipped after 40s). `/api/chat` appends L4 persona style hints (fail-safe). No new routes were added on 2026-11-18.
