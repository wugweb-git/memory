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

## 🔴 THE BIG ONE — Real ingestion architecture (mostly NOT built)

The "long source list" exists today only as **decorative components that aren't mounted**
(`NeuralConnections.tsx`, `IntegrationMatrix.tsx`, `InspirationHub.tsx`) + a `Source` table + a
display-only mapper (`integrations/from-sources.ts`). `sync/platform-sync.ts` is a fake stub. There is
**no connector framework, no Sources/Integrations screen, no auto-sync scheduler, no device
permissions beyond mic.** Full build plan:

### 1. Connector framework — `src/lib/ingestion/connectors/`
Registry of modules implementing:
`{ id, label, category, kind: rss|api|oauth|manual|device, cadenceMins, requires: env|oauth|none,
configured(): boolean, sync(source): {ingested, skipped} }`.
Reuse `ingestion/fetchers.ts` (`fetchUrl`, `parseFeed`, `extractArticle`), `notion.ts`, `blobLayer.ts`.

### 2. Real free connectors (buildable now, no OAuth)
- **GitHub** → `github.com/{user}.atom`
- **YouTube** → `youtube.com/feeds/videos.xml?channel_id=…`
- **Medium / Substack / blog** → RSS (`parseFeed` works)
- **Notion** → wire existing `lib/ingestion/notion.ts` into framework + UI (needs `NOTION_TOKEN`)
- **RSS / Article URL / Upload / Voice** → register the already-working paths

### 3. OAuth/API-gated connectors (framework + honest "Connect" state — NO fake sync)
- **Google Drive / Calendar** → OAuth2 (`/api/oauth/google/{start,callback}` stubs ready for client id/secret)
- **LinkedIn, Twitter/X** → ⚠️ no free API/feed — cannot auto-sync without paid/OAuth
- **Behance** → ⚠️ no public API/RSS
- **Dribbble** → OAuth required
  → all show "needs credentials", go live the moment creds exist.

### 4. Source model + Neon migration (additive)
Add to `Source`: `kind, url, cadence_mins, config Json?, enabled, last_error`. Seed one row per connector.

### 5. Sources/Integrations screen — `/integrations` (feature-flagged)
The "syncs" surface planned (`WORKSPACE_NAV: Integrations`) but never routed. Real manager: list every
connector w/ live status, **Sync now** per source, last-sync + failures, enable/disable, connect.
New `GET/POST /api/sources` + `POST /api/sources/[id]/sync`.

### 6. Auto-sync scheduler — `src/jobs/source-sync.ts`
For each enabled+configured Source past its cadence → run connector → buffer. Wire into cron
(`api/jobs/run`). Manual "Sync now" always available (Hobby cron = daily).

### 7. Device-permission capture (browser)
Beyond voice (done): **geolocation** (location context), **clipboard** (on click), **notifications**
(opt-in). Real `navigator.*` prompts writing `source=device` blobs. No silent capture.

### 8. Email inbound
Keep `/api/ingest/email` (payload). Add Postmark/Resend inbound-webhook parsing + signature verify
(`webhooks/verify.ts`). Owner points a provider's inbound webhook at the route.

---

## 🟡 Other confirmed pending

- **`/admin` redesign** — last screen still on the old dark SPA theme → M3/light.
- **Stale-bundle crash** — the "Application error: client-side exception" seen after rapid deploys is a
  stale JS chunk (a hard-refresh fixes it; current build verified healthy). Fix: emit
  `NEXT_PUBLIC_BUILD_ID`, client toasts "New version — refresh" on chunk-load error.
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
- [ ] **Google OAuth app** (client id/secret) → for Drive + Calendar connectors.
- [ ] **Sanity admin token** → sanity.io/manage → API → Tokens → **Administrator** scope (current write
      token is Editor-only) → enables `sanity schema deploy` for Studio editing. In-app CMS works now.
- [ ] **Email provider** (Postmark/Resend free tier) → point inbound webhook at `/api/ingest/email`.
- [ ] **Rotate** the API keys pasted in chat (Groq/OpenAI/Gemini/MiniMax) when convenient.
- [ ] **Delete seeded `sample` content** after validating the profile UI.
- [ ] **Vercel Pro** (optional) → publish queue faster than daily.

---

## Build order when resuming
Framework → free connectors → Source model+migration → `/integrations` screen → scheduler →
device capture → OAuth stubs → email → admin redesign → deep items. Deploy+verify after the
connector/screen/scheduler core, then again after the rest. Every connector must **really fetch or
honestly show "needs credentials"** — nothing decorative.
