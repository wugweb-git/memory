#!/usr/bin/env node
/**
 * Model bench: one representative prompt per job against every model in that
 * job's chain (via OpenRouter). Prints model, ok, ms, JSON-valid, output length.
 *
 *   OPENROUTER_API_KEY=... node scripts/model-bench.mjs [--max 40] [--job ask] [--dry]
 *
 * The free tier allows ~50 `:free` requests/day, so total requests are hard
 * capped (--max, default 40). --dry prints the plan and sends nothing.
 * Chains are the defaults below unless <JOB>_MODELS env overrides are set.
 * Keep DEFAULTS in sync with src/lib/ai/models.ts.
 */
const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

const JOBS = {
  ask: {
    env: 'ASK_MODELS', json: false,
    defaults: ['nvidia/nemotron-3.5-lightning:free', 'google/gemma-4-26b-a4b-it:free', 'particle-ai/particle-1:free'],
    prompt: 'In two sentences, what is a personal cognitive operating system?',
  },
  decision: {
    env: 'DECISION_MODELS', json: true,
    defaults: ['nvidia/nemotron-3-ultra-550b-a55b:free', 'google/gemma-4-31b-it:free', 'inclusionai/ling-3.2-flash:free'],
    prompt: 'Return ONLY JSON {"recommendations":[{"action":string,"why":string}],"confidence":number}. Context: owner shipped 3 features this week, no outreach logged. Suggest 2 next actions.',
  },
  signals: {
    env: 'SIGNALS_MODELS', json: true,
    defaults: ['liquid/lfm-3-1.7b:free', 'recursive/flint-v1.0:free', 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free'],
    prompt: 'Return ONLY JSON {"topics":[string],"sentiment":"positive|neutral|negative"} for: "Shipped passkey sign-in today, tests green, a bit tired."',
  },
  summary: {
    env: 'SUMMARY_MODELS', json: false,
    defaults: ['inclusionai/ling-3.2-flash:free', 'google/gemma-4-26b-a4b-it:free'],
    prompt: 'Summarise in one sentence: The team migrated from MongoDB to Neon Postgres with pgvector, kept Atlas as cold archive, and re-embedded nothing.',
  },
  ingest: {
    env: 'INGEST_MODELS', json: true,
    defaults: ['cohere/north-mini-code:free', 'google/gemma-4-26b-a4b-it:free', 'dots-studio/dots-3-note-preview:free'],
    prompt: 'Return ONLY JSON {"title":string,"entities":[string],"date":string|null} extracted from: "Met Ana on 2026-03-02 to plan the Lisbon launch."',
  },
};

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const v = process.argv[i + 1];
  return v === undefined || v.startsWith('--') ? true : v;
}

function chainFor(job) {
  const raw = process.env[JOBS[job].env];
  const list = (raw || '').split(',').map((s) => s.trim()).filter(Boolean);
  return list.length ? [...new Set(list)] : JOBS[job].defaults;
}

function jsonValid(text) {
  const t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const cands = [t, fence?.[1]?.trim(), t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1)].filter(Boolean);
  for (const c of cands) { try { JSON.parse(c); return true; } catch { /* next */ } }
  return false;
}

async function main() {
  const dry = arg('dry', false) === true;
  const max = Number(arg('max', 40));
  const only = arg('job', null);
  const key = process.env.OPENROUTER_API_KEY;
  if (!dry && !key) {
    console.error('OPENROUTER_API_KEY is not set (use --dry to preview the plan).');
    process.exit(1);
  }
  const plan = [];
  for (const job of Object.keys(JOBS)) {
    if (only && only !== job) continue;
    for (const model of chainFor(job)) plan.push({ job, model });
  }
  const capped = plan.slice(0, Math.max(0, max));
  console.log(`Plan: ${plan.length} requests, cap ${max}, running ${capped.length}${dry ? ' (dry run, nothing sent)' : ''}`);

  const rows = [];
  for (const { job, model } of capped) {
    if (dry) { rows.push({ job, model, ok: '-', ms: '-', json: JOBS[job].json ? '-' : 'n/a', len: '-' }); continue; }
    const started = Date.now();
    let ok = false, text = '', note = '';
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        signal: AbortSignal.timeout(30000),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
          'HTTP-Referer': 'https://www.vedanshusrivastava.com',
          'X-Title': 'Identity Prism bench',
        },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: JOBS[job].prompt }], temperature: 0.1 }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        text = data?.choices?.[0]?.message?.content ?? '';
        ok = typeof text === 'string' && text.trim().length > 0;
      } else {
        note = `http_${res.status}`;
      }
    } catch (e) {
      note = e?.name === 'TimeoutError' ? 'timeout' : 'network';
    }
    rows.push({
      job, model, ok: ok ? 'yes' : `no${note ? ` (${note})` : ''}`, ms: Date.now() - started,
      json: JOBS[job].json ? (ok ? (jsonValid(text) ? 'yes' : 'no') : 'no') : 'n/a',
      len: text ? text.length : 0,
    });
  }
  console.table(rows);
  if (plan.length > capped.length) console.log(`Skipped ${plan.length - capped.length} requests due to --max.`);
}

main();
