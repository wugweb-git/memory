# PENDING — Identity Prism OS

> Single source of truth for what's live, what's not, and what to do next.
> Last updated 2026-07-07. Prod: `memory-wugweb.vercel.app` (auto-deploys from `main`).

---

## ✅ Live and verified on prod

- **DB:** single Neon/Postgres (Mongo removed; pgvector + HNSW for embeddings). ~46 tables.
- **Auth:** owner login (`admin@wugweb.com`), Edge-safe JWT middleware, RBAC on `/admin` + admin APIs.
- **Cognitive (L3):** decide / evaluate / gaps / prioritize — **Groq** (`llama-3.3-70b-versatile`).
  Mode selector removed (single brain). LLM provider is pluggable (Groq → Gemini fallback).
- **Persona (L4):** full rebuild pipeline (evidence → traits → Groq voice synthesis → confidence-gated
  evolution, reversible). Verified: confidence 0.5 → 0.62.
- **Output (L5):** Output studio (generate → edit → publish), publishing queue w/ retry + DLQ +
  idempotency, direct publish (no n8n), Sanity CMS sync.
- **Profile / exhibition:** `/p/[handle]` renders every section (ventures, career tree, writing,
  showcase w/ cover images, services, testimonials, references). Seeded dummy UX case study + blog +
  project (tagged `sample`) for UI validation — delete when done.
- **Ingestion (WORKING):** file upload (PDF via `unpdf`, text, HTML, MD), article-URL fetch, RSS
  fetch+parse, **Notion** (real token connector), voice (mic). Buffer capture tabs:
  Upload / Voice / Files / Link / Pulse.
- **Security:** owner-guarded + rate-limited ingest/cognitive/upload routes; distributed rate-limit in
  Neon; dependabot **0 vulnerabilities**.
- **Career:** `/career` (career tree editor + job pipeline). **Recommendation engine** wired to Console
  "Next best actions". **System → Modules** feature toggles.

---

## 🟢 Real ingestion architecture — CORE BUILT (2026-07-09)

The connector framework, real free connectors, sources API, auto-sync scheduler, and the
`/integrations` screen are **built + build-green** (`npx tsc --noEmit` and `npm run build` both pass;
GitHub `.atom` feed verified live/parseable). What's live:

- **Connector framework** — `src/lib/ingestion/connectors/` (`types.ts`, `state.ts`, `feed.ts`,
  `notion.ts`, `registry.ts`, `index.ts`). Each connector: `{ id, label, category, kind, requires,
  cadenceMins, setupHint, configured(), sync() }`. Cross-run dedup + cadence state lives in the existing
  `scheduler_state` table (key `connector:<id>`) — **no schema migration required**.
- **Real free connectors** — GitHub (`{user}.atom`, user from `IDENTITY_CONFIG`/`GITHUB_USER`),
  YouTube (`YOUTUBE_CHANNEL_ID`), Blog/Medium/Substack (`BLOG_RSS_URL`), Notion (wraps `notion.ts`,
  dedup-aware). Manual surfaces (upload/voice/link/rss-url) registered for visibility.
- **Honest OAuth placeholders** — Google Drive/Calendar, LinkedIn, X, Behance, Dribbble show
  `configured: false` + a setup hint. **No fake sync** — `sync()` returns `NOT_CONFIGURED`.
- **Sources API** — `GET /api/sources` (registry + live status), `POST /api/sources/[id]/sync`
  ("Sync now", owner-guarded + rate-limited).
- **Scheduler** — `src/jobs/source-sync.ts` runs every configured+due connector; wired into
  `/api/jobs/run` (Vercel Cron; Hobby = daily). Manual "Sync now" always available.
- **/integrations screen** — grouped (auto-sync / manual / needs-credentials) with live status dots,
  last-sync + result, per-source Sync now. Added to nav (Data group). Not yet verified in a live
  browser (local preview blocked by a sandbox `getcwd` error; verify on prod after deploy).

### Still to build (follow-ups)
1. **OAuth flows** — ✅ **Google DONE (2026-07-09).** Real authorization-code flow with refresh:
   `lib/oauth/google.ts` (token store in `scheduler_state` key `oauth:google`, CSRF state, auto-refresh),
   `GET /api/oauth/google/{start,callback}`, and real **Drive** + **Calendar** read-only connectors
   (`connectors/google.ts`) that dedupe + hold review-first. `/integrations` shows Connect → Sync now
   once consent completes. Inert until `GOOGLE_CLIENT_ID/SECRET` are set. **Still open:** Dribbble OAuth;
   LinkedIn/X/Behance have no free API. Connector interface gained optional async `connected()` +
   `authStartPath` to model the two-step (creds set → consent granted) readiness.
2. ✅ **Device-permission capture (browser)** — DONE (2026-07-09). Buffer → **Device** tab: geolocation,
   clipboard (on click), notifications (opt-in). Real `navigator.*` prompts → `source=device` blobs via
   owner-guarded `POST /api/ingest/device` (`lib/ingestion/device.ts`). No silent capture.
3. ✅ **Email inbound** — DONE (2026-07-09). `POST /api/webhooks/email` verifies a real HMAC-SHA256
   signature (constant-time, hex/base64, `sha256=` prefix) **or** a shared token, then parses Postmark/
   Resend/generic payloads (`lib/ingestion/email-inbound.ts`) → held-for-review blob. Refuses (503) if
   neither `INBOUND_EMAIL_SECRET` nor `INBOUND_EMAIL_TOKEN` is set — never accepts unauthenticated writes.
   Replaced the fake `webhooks/verify.ts` stub with genuine crypto.
4. **Optional `Source` table enrichment** — the framework runs off the code registry + `scheduler_state`.
   If per-source DB rows are wanted (owner-editable feed URLs, enable/disable in DB), add
   `kind, url, cadence_mins, config, enabled, last_error` to `Source` via additive Neon migration and
   seed one row per connector. Deliberately deferred — not needed for the current single-owner flow.
5. ✅ **Retire decorative components** — DONE (2026-07-09). Deleted `NeuralConnections.tsx`,
   `IntegrationMatrix.tsx`, `InspirationHub.tsx`, `sync/platform-sync.ts` (all had zero importers).
   Kept `integrations/from-sources.ts` — still used by `lib/health/system.ts`.

---

## 🟡 Other confirmed pending

- ✅ **`/admin` redesign** — DONE (2026-07-09). `/admin/memory` (the last dark full-screen SPA) now
  renders inside `AppShell` with token-only colors (no hardcoded palette / neon glows / gradients),
  sentence-case headings, and light-theme surfaces — across the page + all 9 child components
  (`RagTester`, `MemoryExplorer`, `PacketInspector`, `IntelPanel`, `SemanticPanel`, `SignalTimeline`,
  `IngestionMonitor`, `EmbeddingMonitor`, `ActivityLog`). `/admin` + `/admin/profile` were already M3.
  Build-green + palette-grep clean; browser-verify on prod after deploy (local preview blocked).
- ✅ **Stale-bundle crash** — DONE (2026-07-09). `ChunkReloadGuard` (mounted in root layout) catches
  ChunkLoadError / failed dynamic-import errors and reloads once (60s throttle guards against loops).
  `next.config.mjs` emits `NEXT_PUBLIC_BUILD_ID` from `VERCEL_GIT_COMMIT_SHA` + stable `generateBuildId`.
- **Deep hardening (roadmap Phase 3/6):** load-test script; Postgres partitioning for
  `execution_audit_logs`/provenance; multi-tenant boundaries; immutable provenance ledger; persona
  checkpoint/anomaly guards; twin contradiction alerts.
- **Langfuse tracing** — still a no-op facade; needs `LANGFUSE_PUBLIC_KEY` + `HOST`.
- **Legacy Express layer** — dormant (`src/routes`, `src/models`, `src/server.js`); audit callers then retire.

---

## 👤 OWNER ACTION ITEMS (only you can do these)

- [ ] **OpenRouter key** → buy embedding tokens, set `OPENROUTER_API_KEY` in Vercel. Unblocks memory
      search + RAG-grounded chat + auto-embedding. (Provider already wired: `lib/memory/embeddings.ts`.)
- [ ] **`NOTION_TOKEN`** → notion.so/my-integrations → internal integration → share pages → set in Vercel.
      Notion sync goes live immediately.
- [ ] **Google OAuth app** → console.cloud.google.com → OAuth client (Web). Set `GOOGLE_CLIENT_ID` +
      `GOOGLE_CLIENT_SECRET` in Vercel; add redirect URI `https://<domain>/api/oauth/google/callback`
      (or set `GOOGLE_REDIRECT_URI`). Then Connect from `/integrations` → Drive + Calendar sync live.
- [ ] **Sanity admin token** → sanity.io/manage → API → Tokens → **Administrator** scope (current write
      token is Editor-only) → enables `sanity schema deploy` for Studio editing. In-app CMS works now.
- [ ] **Email provider** (Postmark/Resend free tier) → set `INBOUND_EMAIL_SECRET` (HMAC) or
      `INBOUND_EMAIL_TOKEN`, then point the provider's inbound webhook at `/api/webhooks/email`.
- [ ] **Rotate** the API keys pasted in chat (Groq/OpenAI/Gemini/MiniMax) when convenient.
- [ ] **Delete seeded `sample` content** after validating the profile UI.
- [ ] **Vercel Pro** (optional) → publish queue faster than daily.

---

## Build order when resuming
Framework → free connectors → Source model+migration → `/integrations` screen → scheduler →
device capture → OAuth stubs → email → admin redesign → deep items. Deploy+verify after the
connector/screen/scheduler core, then again after the rest. Every connector must **really fetch or
honestly show "needs credentials"** — nothing decorative.
