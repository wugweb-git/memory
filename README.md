# Vercel Serverless Adaptation

This project uses an Express app exported from `src/server.js` and wrapped by `api/index.js` for Vercel.

## What was changed

- `src/server.js` exports Express app (no `app.listen`)
- `api/index.js` wraps exported app for serverless runtime
- `vercel.json` routes all `/api/*` requests to `api/index.js`
- Added `/api/test` route

## Endpoints

- `GET /api/test`
- `GET /api/items`
- `POST /api/items`
- `POST /api/sync`
- `POST /api/email`
- `GET /api/health`
