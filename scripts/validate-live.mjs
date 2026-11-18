#!/usr/bin/env node
// Live-site validator. Dependency-free (Node >= 20, global fetch).
// Usage: node scripts/validate-live.mjs [--base URL] [--json] [--no-chat] [--list]
// Only talks to the given base (default: main domain). Vercel preview hosts are refused.
import { pathToFileURL } from 'node:url';

export const DEFAULT_BASE = 'https://www.vedanshusrivastava.com';
const TIMEOUT_MS = 30000;

const pass = (detail = '') => ({ status: 'PASS', detail });
const fail = (detail = '') => ({ status: 'FAIL', detail });
const skip = (detail = '') => ({ status: 'SKIP', detail });

export function isAllowedBase(base) {
  let u;
  try { u = new URL(base); } catch { return false; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return false;
  return !/\.vercel\.app$/i.test(u.hostname);
}

async function req(ctx, path, init = {}) {
  const url = new URL(path, ctx.base).toString();
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    return await ctx.fetch(url, { redirect: 'manual', ...init, signal: ac.signal });
  } finally {
    clearTimeout(t);
  }
}

async function json(res) {
  try { return JSON.parse(await res.text()); } catch { return undefined; }
}

const status = (name, path, expected, init) => ({
  name,
  async run(ctx) {
    const res = await req(ctx, path, init);
    return res.status === expected ? pass(`${res.status}`) : fail(`expected ${expected}, got ${res.status}`);
  },
});

export const checks = [
  status('GET /ask returns 200', '/ask', 200),
  status('GET /login returns 200', '/login', 200),
  {
    name: 'GET /login contains "Keep me signed in"',
    async run(ctx) {
      const res = await req(ctx, '/login');
      if (res.status !== 200) return fail(`status ${res.status}`);
      return (await res.text()).includes('Keep me signed in') ? pass() : fail('text not found');
    },
  },
  status('POST /api/jobs/process without secret is 401', '/api/jobs/process', 401, { method: 'POST' }),
  status('GET /api/memory/list is 401', '/api/memory/list', 401),
  status('GET /api/memory/public is 401', '/api/memory/public', 401),
  status('GET /api/health/system is 401', '/api/health/system', 401),
  {
    name: 'GET /api/profile/system_user is published',
    async run(ctx) {
      const res = await req(ctx, '/api/profile/system_user');
      if (res.status !== 200) return fail(`status ${res.status}`);
      const body = await json(res);
      const p = body && (body.profile ?? body.data ?? body);
      return p && p.isPublished === true ? pass('isPublished true') : fail('isPublished is not true');
    },
  },
  {
    name: 'GET /api/showcase enabled, no drafts',
    async run(ctx) {
      const res = await req(ctx, '/api/showcase');
      if (res.status !== 200) return fail(`status ${res.status}`);
      const body = await json(res);
      if (!body || typeof body !== 'object') return fail('not JSON');
      if (body.enabled !== true) return fail('enabled is not true');
      const ids = [];
      const walk = (v) => {
        if (Array.isArray(v)) v.forEach(walk);
        else if (v && typeof v === 'object') {
          for (const [k, x] of Object.entries(v)) {
            if ((k === '_id' || k === 'id') && typeof x === 'string') ids.push(x);
            walk(x);
          }
        }
      };
      walk(body);
      const drafts = ids.filter((i) => i.startsWith('drafts.'));
      return drafts.length ? fail(`${drafts.length} draft id(s) exposed`) : pass(`${ids.length} ids, no drafts`);
    },
  },
  {
    name: 'GET /manifest.json valid',
    async run(ctx) {
      const res = await req(ctx, '/manifest.json');
      if (res.status !== 200) return fail(`status ${res.status}`);
      const m = await json(res);
      if (!m) return fail('not JSON');
      if (!m.name) return fail('missing name');
      if (!m.start_url) return fail('missing start_url');
      if (!Array.isArray(m.icons) || m.icons.length === 0) return fail('missing icons');
      const maskable = m.icons.some((i) => /\bmaskable\b/.test(String(i.purpose || '')));
      return maskable ? pass(`${m.icons.length} icons incl. maskable`) : fail('no maskable icon');
    },
  },
  {
    name: 'GET /sw.js is 200 JavaScript',
    async run(ctx) {
      const res = await req(ctx, '/sw.js');
      if (res.status !== 200) return fail(`status ${res.status}`);
      const ct = res.headers.get('content-type') || '';
      return /javascript|ecmascript/i.test(ct) ? pass(ct) : fail(`content-type ${ct || 'missing'}`);
    },
  },
  {
    name: 'x-vercel-id header present',
    async run(ctx) {
      const res = await req(ctx, '/ask');
      return res.headers.get('x-vercel-id') ? pass() : fail('header missing');
    },
  },
  {
    name: 'POST /api/chat streams (1 request)',
    async run(ctx) {
      if (ctx.noChat) return skip('--no-chat (free tier capped ~50 req/day)');
      const res = await req(ctx, '/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'Say hello in one short sentence.' }] }),
      });
      if (res.status !== 200) return fail(`status ${res.status}`);
      const ct = res.headers.get('content-type') || '';
      if (!/text\/event-stream/i.test(ct)) return fail(`content-type ${ct || 'missing'}`);
      const text = await res.text();
      const lines = text.split('\n').filter((l) => l.startsWith('data:'));
      if (!lines.some((l) => l.includes('text-delta'))) return fail('no text-delta data line');
      if (!text.includes('[DONE]')) return fail('no [DONE]');
      return pass(`${lines.length} data lines`);
    },
  },
  {
    name: 'POST /api/jobs/process with secret (embedding counts)',
    async run(ctx) {
      const secret = ctx.env && ctx.env.VALIDATE_JOB_SECRET;
      if (!secret) return skip('VALIDATE_JOB_SECRET not set');
      const res = await req(ctx, '/api/jobs/process', {
        method: 'POST',
        headers: { authorization: `Bearer ${secret}` },
      });
      if (res.status !== 200) return fail(`status ${res.status}`);
      const body = await json(res);
      if (!body) return fail('not JSON');
      const find = (v, key) => {
        if (v && typeof v === 'object') {
          if (typeof v[key] === 'number') return v[key];
          for (const x of Object.values(v)) { const r = find(x, key); if (r !== undefined) return r; }
        }
        return undefined;
      };
      const parts = ['scanned', 'embedded', 'failed'].map((k) => `${k}=${find(body, k) ?? 'n/a'}`);
      return pass(parts.join(' '));
    },
  },
];

export async function runChecks(ctx, list = checks) {
  const results = [];
  for (const c of list) {
    let r;
    try {
      r = await c.run(ctx);
    } catch (e) {
      r = fail(`error: ${e && e.name === 'AbortError' ? 'timeout' : (e && e.message) || String(e)}`);
    }
    results.push({ name: c.name, status: r.status, detail: r.detail || '' });
  }
  return results;
}

export function exitCode(results) {
  return results.some((r) => r.status === 'FAIL') ? 1 : 0;
}

export function formatTable(results) {
  const w = Math.max(...results.map((r) => r.name.length), 4);
  const rows = results.map((r) => `${r.status.padEnd(5)} ${r.name.padEnd(w)}  ${r.detail}`);
  const count = (s) => results.filter((r) => r.status === s).length;
  rows.push('', `PASS ${count('PASS')}  FAIL ${count('FAIL')}  SKIP ${count('SKIP')}`);
  return rows.join('\n');
}

export function parseArgs(argv) {
  const o = { base: DEFAULT_BASE, json: false, noChat: false, help: false, list: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--base') o.base = argv[++i];
    else if (a.startsWith('--base=')) o.base = a.slice(7);
    else if (a === '--json') o.json = true;
    else if (a === '--no-chat') o.noChat = true;
    else if (a === '--list') o.list = true;
    else if (a === '--help' || a === '-h') o.help = true;
  }
  return o;
}

const HELP = `Usage: node scripts/validate-live.mjs [--base URL] [--json] [--no-chat] [--list]
  --base URL   site to check (default ${DEFAULT_BASE}); *.vercel.app is refused
  --json       machine-readable output
  --no-chat    skip the /api/chat check (free tier is capped ~50 req/day)
  --list       list checks without running them
Env: VALIDATE_JOB_SECRET enables the authenticated /api/jobs/process check.
Exit code 1 if any check FAILs.`;

export async function main(argv = process.argv.slice(2), env = process.env, f = globalThis.fetch) {
  const o = parseArgs(argv);
  if (o.help) { console.log(HELP); return 0; }
  if (o.list) { checks.forEach((c) => console.log(c.name)); return 0; }
  if (!o.base || !isAllowedBase(o.base)) {
    console.error('Refusing base: must be a valid http(s) URL and not a *.vercel.app preview host.');
    return 2;
  }
  const results = await runChecks({ base: o.base, fetch: f, env, noChat: o.noChat }, checks);
  console.log(o.json ? JSON.stringify({ base: o.base, results, exitCode: exitCode(results) }, null, 2) : formatTable(results));
  return exitCode(results);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then((c) => process.exit(c));
}
