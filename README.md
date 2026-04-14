# Memory System — Phase 1 (Blob-first)

Phase 1 is now wrapped on a **Mongo/Redis-free** stack. Runtime state is persisted to **Vercel Blob** via a JSON store.

## Environment variables

Required:
- `AUTH_SECRET`

Recommended:
- `BLOB_READ_WRITE_TOKEN` (required for Blob persistence and avatar upload/view)

Optional:
- `BLOB_DATA_PATH` (default: `memory/store.json`)
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ALLOWED_ORIGINS`
- `REQUEST_LIMIT_BYTES`

## API routes

- `GET /api`
- `GET /api/test`
- `GET /api/test-db` (compat alias for storage check)
- `GET /api/test-storage`
- `POST /api/avatar/upload?filename=<name>`
- `GET /api/avatar/view?pathname=<blob-path>`
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/items`
- `POST /api/items`
- `DELETE /api/items`
- `POST /api/sync`
- `POST /api/email`
- `GET /api/health`
- `GET /api/logs`
- `GET /api/sources`
- `POST /api/sources`
- `POST /api/sync/run`

## Scripts

```bash
# Health/audit checks
AUTH_SECRET="<secret>" npm run audit
AUTH_SECRET="<secret>" npm run test:e2e
AUTH_SECRET="<secret>" npm run db:ping

# Jobs and data lifecycle
AUTH_SECRET="<secret>" npm run jobs
AUTH_SECRET="<secret>" npm run backup
AUTH_SECRET="<secret>" npm run restore -- backups/<file>.json
```

## Notes

- `scripts/backup.js` and `scripts/restore.js` now operate on the Blob-backed JSON datastore (`users/items/sources/logs/metrics/health`).
- If `BLOB_READ_WRITE_TOKEN` is not set, data will run in memory for the process lifetime (useful for local dev smoke tests).
