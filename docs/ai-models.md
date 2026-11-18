# AI model routing (per job)

When `OPENROUTER_API_KEY` is set, LLM calls are routed per job through OpenRouter
(`https://openrouter.ai/api/v1/chat/completions`) using ordered free-model chains.
When the key is absent, nothing changes: `/api/chat` and the L3 brain use the
existing `AI_GATEWAY_*` / `GROQ_API_KEY` / Gemini / OpenAI path.

Code: `src/lib/ai/models.ts` (registry), `src/lib/ai/openrouter.ts` (`runJob`).
Every LLM call site is mapped to a job below. Without the key each site keeps its legacy provider.

## Call site -> job (when OPENROUTER_API_KEY is set)

| Call site | Job | Notes |
| --- | --- | --- |
| `/api/chat` | ask | owned elsewhere |
| `runLLM` / `runLLMWithMeta` (`src/lib/cognitive/llm.ts`): orchestrator single pass, `/api/cognitive/evaluate`, `/api/cognitive/prioritize`, `src/lib/persona/rebuild.ts` | decision | JSON |
| `runAgentLLM`: reasoner agent (`agents/reasoner.ts`) | decision | forced plain text (`json:false`) |
| `runAgentLLM`: decision agent (`agents/decision.ts`) | decision | JSON |
| `runTextLLM` (`src/lib/output/generator.ts`, L5 content) | ask | prose |
| `ArtifactGenerator` (`src/lib/intelligence/generator.ts`) | ask | prose |
| `SemanticEngine` entity/intent/topic extraction (`src/lib/processing/semantic.ts`, cron `memory-pipeline`) | ingest | JSON, via `createJobClient('ingest')`; an injected `llmClient` (diagnostics) still wins |
| Signal extraction (`src/lib/processing/signals.ts`) | signals | rule-based today, no LLM call; the job is reserved for LLM classification |
| Summarising / compressing | summary | no such call site exists today; reserved |
| Signal importance (opt-in `DECIDER_SIGNALS=1`) | Decider API | see below |
| Mode routing (opt-in `DECIDER_MODE=1`) | Decider API | see below |

Embeddings are not chat jobs (see below).

## Jobs and default chains (first = tried first)

| Job | Env override | JSON | Default chain |
| --- | --- | --- | --- |
| ask | `ASK_MODELS` | no | nvidia/nemotron-3.5-lightning, google/gemma-4-26b-a4b-it, particle-ai/particle-1 |
| decision | `DECISION_MODELS` | yes | nvidia/nemotron-3-ultra-550b-a55b, google/gemma-4-31b-it, inclusionai/ling-3.2-flash |
| signals | `SIGNALS_MODELS` | yes | liquid/lfm-3-1.7b, recursive/flint-v1.0, nvidia/nemotron-3-nano-omni-30b-a3b-reasoning |
| summary | `SUMMARY_MODELS` | no | inclusionai/ling-3.2-flash, google/gemma-4-26b-a4b-it |
| ingest | `INGEST_MODELS` | yes | cohere/north-mini-code, google/gemma-4-26b-a4b-it, dots-studio/dots-3-note-preview |

All IDs carry the `:free` suffix. Overrides are comma-separated, e.g.
`ASK_MODELS=vendor/model-a:free,vendor/model-b:free`.

## Behaviour

- Each model is tried once. On 429, 5xx, timeout, network error, empty content, or
  (JSON jobs) unparseable output, the next model is used. Attempts per call are bounded by chain length.
- JSON jobs: `response_format: json_object` is sent only to models that list it
  (ling-3.2-flash, lfm-3-1.7b, particle-1, flint, both gemma-4, dots-3-note). For
  nemotron-3.5-lightning, nemotron-3-ultra, north-mini-code and nano-omni the JSON is parsed
  tolerantly from text (code fences and surrounding prose stripped).
- The answering model is returned (`runJob` -> `{text, model, attempts}`); the orchestrator
  passes it to the Langfuse generation. `/api/chat` sets an `X-Model` response header.
- `/api/chat` with OpenRouter is not streamed upstream: the full answer is replayed as a UI message stream.
- Sends `HTTP-Referer` (site URL) and `X-Title` headers. Keys are never logged.

## Free-tier limits

The free tier allows roughly 50 `:free` requests per day. Because a 429 moves down the chain
rather than retrying, one chat can consume up to chain-length requests. Keep chains short.

## Changing a model in Vercel

Project Settings -> Environment Variables -> add/edit `ASK_MODELS` (etc.) -> redeploy
(env changes apply to new deployments). Remove the variable to return to the default chain.
Remove `OPENROUTER_API_KEY` to return fully to the legacy provider path.

## Bench

`node scripts/model-bench.mjs --dry` prints the plan. With the key set,
`node scripts/model-bench.mjs --max 40` runs one prompt per job per model and prints
model, ok, ms, JSON-valid, output length. It spends the daily free cap; run sparingly.

## Perplexity Decider (Decisions API)

Client: `src/lib/ai/decider.ts` (`decide`, `yesNo`, `choice`, `score`). Not a chat model: it answers
typed questions about a `state` with probabilities. The request/response shape was read from
OpenRouter's OpenAPI spec (`https://openrouter.ai/openapi.json`, `POST /api/alpha/decisions`,
marked Alpha, so it may change): body `{model, state, questions}`; question types `noul` (yes/no,
answer `noul` = P(true)), `choice` (`criteria` = option -> description, answer `choice` +
`probabilities`), `score` (`criteria` = ordered rubric array, answer `score` + `probabilities`);
a question can come back as `refusal`. Verified from the spec only; the free `pplx-decider-*:free`
model IDs were not exercised live (no key used) and do not appear in `/api/v1/models`, so confirm
with one real call before relying on them.

- Models tried in order, each once: `perplexity/pplx-decider-flash-v1.3:free`,
  `perplexity/pplx-decider-v1.3:free` (override with `DECIDER_MODELS`).
- Helpers never throw; with no key or any error they return a safe default (`ok:false`).
- `DECIDER_SIGNALS=1` (default off): one request per packet, one yes/no per signal; signals under
  `DECIDER_SIGNALS_MIN` (default 0.2) are dropped except the primary; the score is stored in
  `metadata.decider_importance`. Failures keep all signals.
- `DECIDER_MODE=1` (default off): when the caller passes no valid mode (missing, `auto`, unknown),
  the orchestrator picks architect/founder/operator via `choice`. An explicit valid mode is never overridden.

## Embeddings: checking and switching

**Current (19 Nov 2026):** with `OPENROUTER_API_KEY` set and no `EMBEDDINGS_MODEL`, embeddings use the free
`nvidia/nemotron-3.5-embed-8b:free` with `dimensions: 1536` sent to the API (server-side, so it fits
`vector(1536)` with no migration; verified: 1536-length vector). Override with `EMBEDDINGS_MODEL` /
`EMBEDDINGS_DIMENSIONS`. The 1b models only accept their native 2048 dims. Free quota (~50/day) is shared
with chat: backfill existing rows in small batches over several days. Old vectors came from a different
model, so re-embed before trusting similarity.

Embeddings stay on the current provider (`src/lib/memory/embeddings.ts`, 1536 dims for the pgvector
column). OpenRouter lists these free NVIDIA embedders (`/api/v1/embeddings/models`):
`nvidia/nemotron-3.5-embed-1b:free`, `nvidia/nemotron-3.5-embed-8b:free`, `nvidia/nemotron-3-embed-1b:free`.

1. Check dimensions: `node scripts/embedder-check.mjs --dry` (plan), then with the key
   `node scripts/embedder-check.mjs [--model id]` (one request per model; reports the vector length).
2. If a model returns 1536 dims, set `EMBEDDINGS_MODEL=<id>` in Vercel and redeploy (OpenRouter key path
   already uses `EMBEDDINGS_MODEL`). Existing vectors were made by a different model, so old and new
   vectors are not comparable: re-embed the rows (or only query new rows) before trusting similarity.
3. If the dimension differs, the Neon DB is shared with another app, so only additive changes are
   allowed: add a NEW nullable column (e.g. `embedding_v2 vector(N)`) plus its own HNSW index via an
   additive migration (`ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`), write/query both
   columns during backfill, then flip reads. Never alter or drop the existing `vector(1536)` column or index.

## Bench results (19 Nov 2026, free tier, 14 requests)

Passed: nemotron-3.5-lightning, particle-1 (ask); nemotron-3-ultra, ling-3.2-flash (decision, valid JSON); lfm-3-1.7b, flint, nemotron-3-nano-omni (signals, valid JSON); ling-3.2-flash (summary); north-mini-code, dots-3-note (ingest, valid JSON).
`google/gemma-4-26b` and `gemma-4-31b` returned 429 on every call (upstream rate limit); chains fall through to the next model. Live check: `/api/chat` answered via nemotron-3.5-lightning.
Chain budget: 18s per attempt, 52s total (inside the 60s function limit).
