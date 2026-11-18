# API Map
Core APIs: cognitive, output, memory, processing, persona, admin health.

Source of truth: `src/lib/api/endpoints.ts` (checked by `test/**/api-map.test.ts`). Daily `GET/POST /api/jobs/run` also runs behavioural reconciliation, persona-evolution and fingerprint-validation (each in `safeJob`, skipped after 40s). `/api/chat` appends L4 persona style hints (fail-safe). With `OPENROUTER_API_KEY` set, chat (`ask`) and the brain (`decision`) use per-job free-model chains, see `docs/ai-models.md`. No new routes were added on 2026-11-18.

Owner passkeys (WebAuthn, under the public `/api/auth/` prefix): `POST /api/auth/passkey/register-options` and `register-verify` (admin session), `POST login-options` and `login-verify` (anonymous; issue the owner admin session, honour `remember`), `GET /api/auth/passkey/list` and `DELETE /api/auth/passkey/delete` (admin). `POST /api/auth/login` also accepts an optional `remember` boolean (false = session cookie without Max-Age). Table `memory_passkey_credentials`; challenges live in a short-lived signed httpOnly cookie.
