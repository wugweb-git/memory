#!/usr/bin/env node
/**
 * Embedder check: sends one short text to OpenRouter's embeddings endpoint for
 * each candidate NVIDIA embed model and reports the vector length, so you can
 * compare against the pgvector column (vector(1536)) before any switch.
 *
 *   OPENROUTER_API_KEY=... node scripts/embedder-check.mjs [--model id] [--dry]
 *
 * --dry prints the plan and sends nothing. Each model costs one free-tier request.
 * Candidate IDs come from https://openrouter.ai/api/v1/embeddings/models
 * (nvidia/*); they are verified there as of writing.
 */
const ENDPOINT = 'https://openrouter.ai/api/v1/embeddings';
const CANDIDATES = [
  'nvidia/nemotron-3.5-embed-1b:free',
  'nvidia/nemotron-3.5-embed-8b:free',
  'nvidia/nemotron-3-embed-1b:free',
];
const TEXT = 'Shipped passkey sign-in today.';
const TARGET_DIMS = 1536;

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const mi = args.indexOf('--model');
const models = mi !== -1 && args[mi + 1] ? [args[mi + 1]] : CANDIDATES;

console.log(`Plan: ${models.length} request(s) to ${ENDPOINT}, text length ${TEXT.length}, target dims ${TARGET_DIMS}`);
for (const m of models) console.log(`  - ${m}`);
if (dry) {
  console.log('--dry: nothing sent.');
  process.exit(0);
}

const key = process.env.OPENROUTER_API_KEY;
if (!key) {
  console.error('OPENROUTER_API_KEY is not set (use --dry to preview).');
  process.exit(1);
}

for (const model of models) {
  const started = Date.now();
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, input: TEXT }),
    });
    const ms = Date.now() - started;
    if (!res.ok) {
      console.log(`${model}\tHTTP ${res.status}\t${ms}ms`);
      continue;
    }
    const data = await res.json();
    const len = data?.data?.[0]?.embedding?.length ?? 0;
    const verdict = len === TARGET_DIMS ? 'matches 1536' : len ? `DIFFERS from ${TARGET_DIMS}` : 'no vector';
    console.log(`${model}\tdims=${len}\t${verdict}\t${ms}ms`);
  } catch (err) {
    console.log(`${model}\terror ${err?.message ?? err}`);
  }
}
