# Legacy Express API (`api/index.js`)

The repository includes a **legacy Vercel serverless handler** at `api/index.js` that predates the Next.js App Router API surface under `src/app/api/`.

## Status

**Deprecated.** New features must be implemented only in App Router routes. The Express handler remains for backward compatibility with older clients and smoke tests.

## Preferred surface

| Legacy path | App Router replacement |
|-------------|-------------------------|
| `GET /api` | `GET /api/health` or see `docs/API_ENDPOINTS.md` |
| `/api/auth/*` | `src/app/api/auth/*` (if migrated) or dedicated auth routes |
| `/api/memory/*` | `src/app/api/memory/*` |
| `/api/ingest/*` | `src/app/api/ingest/*` |
| `/api/blob-metadata` | `src/app/api/blob/*` |

## Deployment

`vercel.json` uses the Next.js framework; App Router routes take precedence for matching paths. The legacy handler is invoked only when no App Router route exists for the same path.

## Removal plan

1. Audit callers (scripts, external webhooks) against `docs/API_ENDPOINTS.md`.
2. Migrate remaining consumers to App Router handlers.
3. Delete `api/index.js` and `src/server.js` once traffic is zero.
