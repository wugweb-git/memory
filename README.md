# Memory System — Phase 1 (Blob-first)

Phase 1 is now wrapped on a **Mongo/Redis-free** stack. Runtime state is persisted to **Vercel Blob** via a JSON store.

## Environment variables

Required:
- `AUTH_SECRET`

If `AUTH_SECRET` is missing, local development falls back to `dev_auth_secret_change_me`. In production, `AUTH_SECRET` must be explicitly set in environment variables.

Recommended:
- `BLOB_READ_WRITE_TOKEN` (required for Blob persistence and avatar upload/view)
- `OPENAI_API_KEY`
- `GEMINI_API_KEY` (alias supported: `Gemini_API_Key`)

Optional:
- `BLOB_DATA_PATH` (default: `memory/store.json`)
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ALLOWED_ORIGINS`
- `REQUEST_LIMIT_BYTES`

## Deployment quick-fix (Vercel + Netlify)

If deploys are failing, the issue is usually **build/config/env**, not RAG logic.

1. Use Node 20 in the platform settings.
2. Set required env vars (`AUTH_SECRET`, and `BLOB_READ_WRITE_TOKEN` if you need Blob persistence/uploads).
3. Keep platform config minimal:
   - `vercel.json` should only define `"framework": "nextjs"`.
   - `netlify.toml` should use the Next.js plugin and should not force `publish = ".next"`.
4. Ensure lockfile is in sync with `package.json` (`npm install` locally, commit lockfile).
5. Verify locally before pushing:
   ```bash
   npm install
   npm run build
   ```

## System Architecture (The Layers)

The Identity Prism OS is built on a modular, layered architecture for maximum resilience and intelligence:

- **[Layer 1: Memory & Ingestion](docs/layer-1-memory.md)**: The Blob-first storage and RAG core.
- **[Layer 2: Deep Processing](docs/layer-2-processing.md)**: Signal extraction and enrichment engine.
- **[Layer 2.5: Semantic Intelligence](docs/layer-2.5-enrichment.md)**: Hardened governance and pattern recognition.
- **[Recycling Bin](docs/RECYCLING.md)**: Repository of deferred logic and components.

## Architecture Highlights

## Environment Guardrails

To prevent silent failures in production, the system includes an **Environment Audit** script. This runs automatically during the Vercel pre-build phase via `scripts/vercel-readiness.sh`.

You can manually trigger a validation check:
```bash
node scripts/validate-env.js
```

If `AUTH_SECRET` is missing, the audit fails intentionally. `MONGODB_URI` is optional in Blob-first mode; when absent, signals endpoints return empty data until Mongo is configured.

## Secret hygiene (important)

If credentials were ever committed to git history, do this immediately:
1. Revoke/rotate those keys in the provider dashboards (OpenAI, MongoDB, Vercel Blob, etc.).
2. Replace them with platform environment variables (Vercel/Netlify project settings).
3. Never commit real keys again (including base64-encoded forms).

### Rotation + redeploy runbook

1. Rotate these keys first:
   - `OPENAI_API_KEY`
   - `MONGODB_URI` (or `MONGO_URI`)
   - `BLOB_READ_WRITE_TOKEN`
   - `GEMINI_API_KEY` (if used)
   - `AUTH_SECRET`
2. Add the rotated values to:
   - **Vercel** → Project → Settings → Environment Variables
   - **Netlify** → Site settings → Environment variables
3. Validate repo content before deploy:
   ```bash
   npm run security:scan
   node scripts/validate-env.js
   npm run build
   ```
4. Redeploy from the latest commit in each platform dashboard.

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
- `POST /api/memory/ingest`
- `GET /api/memory/packets`
- `GET /api/memory/monitor`
- `GET /api/memory/source`
- `POST /api/memory/source`
- `POST /api/memory/replay`
- `POST /api/memory/packet/action`

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
