# Memory System — Production-ready Phase 1

## What is included

- Serverless API on Vercel
- Auth (`/api/auth/*`) with hashed passwords (bcrypt)
- Multi-user ownership + visibility controls
- Ingestion (`/api/items`, `/api/sync`, `/api/email`)
- File upload (`/api/upload`) + file metadata + delete endpoint (`/api/files/delete`)
- Automation sources (`/api/sources`) + manual sync run (`/api/sync/run`)
- Health endpoints (`/api/health`, `/api/health/system`)
- Logs + admin stats (`/api/logs`, `/api/admin/stats`)
- Backup endpoint (`/api/admin/backup`) + scripts (`scripts/backup.js`, `scripts/restore.js`)
- Background job layer (`lib/jobs.js`)

## Environment variables

Required:
- `MONGO_URI`
- `AUTH_SECRET`

Optional:
- `NODE_ENV`
- `ALLOWED_ORIGINS`
- `REQUEST_LIMIT_BYTES`
- `UPLOAD_DIR`
- `JOB_SECRET`
- `APP_VERSION`

See `.env.example`.

## API compatibility

- Routes are available under `/api/*`.
- Also available with `/api/v1/*` alias via `vercel.json` route mapping.
