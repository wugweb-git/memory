# Memory System — Phase 1 (Blob-first)

Phase 1 is now wrapped on a **Mongo/Redis-free** stack. Runtime state is persisted to **Vercel Blob** via a JSON store.

## Environment variables

Required:
- `AUTH_SECRET`

If `AUTH_SECRET` is missing, the app falls back to `dev_auth_secret_change_me` to avoid startup/login lockout in misconfigured environments (override in production).

Recommended:
- `BLOB_READ_WRITE_TOKEN` (required for Blob persistence and avatar upload/view)

Optional:
- `BLOB_DATA_PATH` (default: `memory/store.json`)
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ALLOWED_ORIGINS`
- `REQUEST_LIMIT_BYTES`

## Environment Guardrails

To prevent silent failures in production, the system includes an **Environment Audit** script. This runs automatically during the Vercel pre-build phase via `scripts/vercel-readiness.sh`.

You can manually trigger a validation check:
```bash
node scripts/validate-env.js
```

If critical variables (like `MONGODB_URI` or `AUTH_SECRET`) are missing, the build will fail intentionally.

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
- `GET /api/telemetry-config`
- `POST /api/telemetry-config`
- `GET /api/blob-metadata`
- `POST /api/blob-metadata`
- `POST /api/ingest/soul`
- `POST /api/ingest/pulse`

## Scripts

```bash
# Health/audit checks
AUTH_SECRET="<secret>" npm run audit
AUTH_SECRET="<secret>" npm run test:e2e
AUTH_SECRET="<secret>" npm run db:ping
AUTH_SECRET="<secret>" ALLOW_IN_MEMORY_STORE=true ./scripts/verify-all.sh
./scripts/setup-origin.sh <git-remote-url>
./scripts/vercel-readiness.sh
./scripts/check-deployment-url.sh https://<your-vercel-app>.vercel.app
./scripts/check-auth-flow.sh https://<your-vercel-app>.vercel.app

# Jobs and data lifecycle
AUTH_SECRET="<secret>" npm run jobs
AUTH_SECRET="<secret>" npm run backup
AUTH_SECRET="<secret>" npm run restore -- backups/<file>.json
```

### Branch reconciliation helper

If you need to merge all local branches into `main` quickly:

```bash
./scripts/merge-all-branches.sh main
```

This script only merges **local** branches. If GitHub remote branches are missing locally, run `git fetch --all --prune` first in a repo with a configured `origin`.

### Why Vercel may not reflect local changes

Vercel Git deployments only update when commits are pushed to the connected remote branch.

If local changes are visible but Vercel is stale, run:

```bash
./scripts/vercel-readiness.sh
```

It validates:
- required deployment files (`vercel.json`, `api/index.js`, `index.html`, `package.json`)
- `vercel.json` JSON syntax
- whether remote `origin` exists
- branch ahead/behind status versus remote

If `origin` is missing in your environment, configure it with:

```bash
./scripts/setup-origin.sh <git-remote-url>
```

## Repository Maintenance (Clean History)

To maintain a clean, linear Git history and avoid messy "octopus" merges:

1. **Configure Pull Strategy**:
   Run this once on your machine:
   ```bash
   git config pull.rebase true
   ```

2. **GitHub Merge Strategy**:
   Always use **"Squash and Merge"** or **"Rebase and Merge"** on Pull Requests. Avoid standard merge commits.

3. **Synchronize Local Workbench**:
   If the remote history has been rewritten (e.g., after an automated cleanup), align your local graph:
   ```bash
   git fetch origin && git reset --hard origin/main
   ```

### Branch policy

`scripts/verify-all.sh` enforces a local branch policy: maximum 3 branches unless explicitly overridden by team workflow.

## Notes

- `scripts/backup.js` and `scripts/restore.js` now operate on the Blob-backed JSON datastore (`users/items/sources/logs/metrics/health`).
- If `BLOB_READ_WRITE_TOKEN` is not set, data will run in memory for the process lifetime (useful for local dev smoke tests).
- `index.html` is a production-oriented single-page client (auth + capture tabs + feed + health/logs/automation), optimized for desktop and mobile.

## Spirit Note + Pulse payload guidance (v2 contract)

`POST /api/ingest/soul` expects manual note structure:

```json
{
  "source_type": "spirit_note",
  "source_origin": "manual",
  "raw_payload": {
    "title": "How I design resilient systems",
    "body": "Long-form note ...",
    "context": "project",
    "signal_intent": "pattern",
    "logic_pattern": "system_design",
    "evidence_links": ["https://github.com/org/repo/pull/123"]
  }
}
```

`POST /api/ingest/pulse` expects telemetry event structure:

```json
{
  "platform": "github",
  "event_id": "evt_123",
  "external_id": "sha-or-guid",
  "raw_payload": { "original": "webhook payload" },
  "candidate_text": "clean summary text for memory update"
}
```
