# AI model routing (per job)

When `OPENROUTER_API_KEY` is set, LLM calls are routed per job through OpenRouter
(`https://openrouter.ai/api/v1/chat/completions`) using ordered free-model chains.
When the key is absent, nothing changes: `/api/chat` and the L3 brain use the
existing `AI_GATEWAY_*` / `GROQ_API_KEY` / Gemini / OpenAI path.

Code: `src/lib/ai/models.ts` (registry), `src/lib/ai/openrouter.ts` (`runJob`).
Wired: `/api/chat` -> `ask`; `runLLM` in `src/lib/cognitive/llm.ts` (the orchestrator's
single-pass call) -> `decision`. `signals`, `summary`, `ingest` are registered and ready
but no call site uses them yet.

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

## Not covered

- Embeddings stay on the current provider (`src/lib/memory/embeddings.ts`, 1536 dims for the
  pgvector column). The free Nemotron embedders need a 1536-dimension check before any switch.
- Perplexity Decider is a Decisions API (returns probabilities, not text). It is not part of
  these chat chains; it would be a later, separate client.
