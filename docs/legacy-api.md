# Legacy Express API — RETIRED (2026-07-07)

The legacy Express/serverless layer (`api/*.js`, `lib/*.js`, `config/config.js`,
`src/server.js`, `src/routes`, `src/models`) has been removed after a full
reference audit: zero imports from the live Next.js app, and its root `api/*.js`
functions were deployed-but-broken (mongoose against the removed MongoDB).

Everything lives in the App Router now — see `docs/API_ENDPOINTS.md` and
`src/lib/api/endpoints.ts`. The old code remains available in git history
(prior to commit "retire legacy Express layer").
