# API Endpoints Map

Base path: `/api`. All routes use App Router unless noted.

## Auth

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/auth/signup` | Register user (JWT cookie + `access_token`) |
| POST | `/auth/login` | Login (JWT cookie + `access_token`) |
| GET | `/auth/me` | Current session user |
| POST | `/auth/logout` | Clear session cookie |

## Health (public)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health/system` | Dashboard metrics + live integrations |

## Admin (requires `admin` role)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/admin/seed` | Seed profile sections + integration sources |
| POST | `/admin/diagnose` | L1 memory validation suite |
| GET | `/admin/sandbox-test` | Sandbox status (disabled placeholder) |
| POST | `/admin/semantic-diagnose` | Semantic/graph audit suite |
| GET | `/admin/persona-health` | Persona DB metrics |
| GET | `/admin/model-health` | Model routing metrics |
| GET | `/admin/output-health` | Output pipeline metrics |
| GET | `/admin/publishing-health` | Publishing queue metrics |
| GET | `/admin/provenance-health` | Provenance metrics |
| GET | `/admin/recommendation-health` | Recommendation metrics |
| GET | `/admin/system-health` | System integrity + sync metrics |

## Analytics & automation

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/analytics/content` | Content analytics (`?userId=`) |
| GET | `/automation/rules` | Automation rules (`?userId=`) |

## Blob (L0)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/blob` | List items (`?type=&source=&state=&limit=&offset=`) |
| POST | `/blob` | Ingest blob item |
| DELETE | `/blob` | Cleanup expired |
| GET | `/blob/[id]` | Single item |
| DELETE | `/blob/[id]` | Delete item |
| GET | `/blob/stats` | Storage stats |
| POST | `/blob/promote` | Promote to memory |
| POST | `/blob/reject` | Reject item |
| POST | `/blob/review` | Mark reviewed |
| POST | `/blob/promotable` | Mark promotable |
| POST | `/blob/bulk` | Bulk actions |
| POST | `/blob/cleanup` | Expired cleanup |

## Chat & upload

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/chat` | RAG streaming chat (AI SDK v6) |
| POST | `/upload` | File upload → memory ingest |

## Cognitive

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/cognitive/decide` | L3 decision engine |
| POST | `/cognitive/evaluate` | Opportunity evaluation |
| POST | `/cognitive/feedback` | Decision feedback |
| POST | `/cognitive/gaps` | Profile gap analysis |
| GET | `/cognitive/history` | Decision history (`?userId=`) |
| POST | `/cognitive/prioritize` | Rank recommendations |
| GET | `/cognitive/traces` | Recent decision traces |

## Memory

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/memory/audit` | Memory audit |
| GET | `/memory/get` | Packet + signals + semantic (`?id=`) |
| GET | `/memory/list` | List packets |
| GET | `/memory/monitor` | Monitor dashboard payload |
| POST | `/memory/packet/action` | Delete/archive packet |
| GET | `/memory/packets` | Vault UI packets |
| POST | `/memory/replay` | Re-ingest packet |
| POST | `/memory/retrieve` | RAG retrieval |
| GET | `/memory/signals` | Activity feed for UI |
| GET | `/memory/stats` | Packet/embedding stats |

## Output

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/output/generate` | Generate artifact |
| GET | `/output/history` | Published outputs (`?userId=`) |
| POST | `/output/publish` | Publish output |
| POST | `/output/schedule` | Schedule publishing |

## Persona

| Method | Path | Purpose |
|--------|------|---------|
| GET/PATCH | `/persona/adaptive-ui` | Adaptive UI profile |
| GET | `/persona/drift` | Evolution timeline |
| POST | `/persona/feedback` | Persona feedback |
| GET | `/persona/profile` | Persona profile |
| POST | `/persona/rebuild` | Rebuild persona |
| GET | `/persona/style` | Style vectors |
| GET | `/persona/traits` | Behavioral traits |

## Processing

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/processing/entities` | Entities |
| GET/POST | `/processing/intelligence` | Patterns |
| GET/POST | `/processing/semantic` | Semantic objects |
| GET/POST | `/processing/signals` | L2 signals |
| GET | `/processing/topics` | Topics |

## Profile, semantic, workflows

| Method | Path | Purpose |
|--------|------|---------|
| GET/POST | `/profile/[username]` | Public profile CRUD |
| GET | `/semantic/search` | Text search over semantic corpus (`?q=`) |
| GET | `/semantic/graph` | Entity relationship graph |
| GET | `/semantic/timeline` | Semantic event timeline |
| GET | `/workflows/logs` | Workflow logs |
| POST | `/workflows/run` | Run workflow |
