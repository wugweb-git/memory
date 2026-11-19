import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateBudget, jobLimits, summarizeBudgets, DEFAULT_DAILY_BUDGETS, BudgetExceededError } from '../../src/lib/cost/guard.ts';
import { runJobGuarded, runJobOrThrow, createJobClient } from '../../src/lib/ai/job-client.ts';
import { recordJobUsage, usageKey, type DayUsage, type UsageStore } from '../../src/lib/cost/tracking.ts';
import { applySignalImportance } from '../../src/lib/processing/signal-importance.ts';
import { selectModel, selectReasonerModel, openRouterEnvForModel } from '../../src/lib/cognitive/routing.ts';
import { getChain } from '../../src/lib/ai/models.ts';
import type { JobName } from '../../src/lib/ai/models.ts';

const ENV = { OPENROUTER_API_KEY: 'k' } as NodeJS.ProcessEnv;
const msgs = [{ role: 'user' as const, content: 'hi' }];

/** In-memory store keyed by UTC day, mirroring the Neon read-modify-write. */
function fakeStore() {
  const rows = new Map<string, DayUsage>();
  const store: UsageStore = {
    async load(key) { return rows.get(key) ?? {}; },
    async record(key, job, attempts) {
      const cur = rows.get(key) ?? {};
      const j = cur[job] ?? { requests: 0, ok: 0, failed: 0, byModel: {} };
      rows.set(key, { ...cur, [job]: { ...j, requests: j.requests + attempts.length } });
    },
  };
  return { store, rows };
}
const okRun = (calls: JobName[]) => (async (job: JobName) => {
  calls.push(job);
  return { text: 'x', model: 'm', attempts: [{ model: 'm', ok: true, ms: 1 }] };
}) as any;
const day = (u: Partial<Record<JobName, number>>): DayUsage =>
  Object.fromEntries(Object.entries(u).map(([k, v]) => [k, { requests: v!, ok: v!, failed: 0, byModel: {} }]));

describe('limits config', () => {
  it('defaults sum to the 50 free cap and signals is small', () => {
    assert.equal(Object.values(DEFAULT_DAILY_BUDGETS).reduce((a, b) => a + b, 0), 50);
    assert.ok(DEFAULT_DAILY_BUDGETS.signals <= 5);
  });
  it('env overrides per job; invalid values are ignored; 0 disables', () => {
    const l = jobLimits({ DAILY_BUDGET_ASK: '40', DAILY_BUDGET_SIGNALS: 'abc', DAILY_BUDGET_SUMMARY: '0' } as any);
    assert.equal(l.ask, 40);
    assert.equal(l.signals, DEFAULT_DAILY_BUDGETS.signals);
    assert.equal(l.summary, 0);
  });
});

describe('budget evaluation', () => {
  it('enforces each job limit independently', () => {
    const l = DEFAULT_DAILY_BUDGETS;
    assert.equal(evaluateBudget(day({ ask: l.ask - 1 }), 'ask', {} as any).allowed, true);
    const d = evaluateBudget(day({ ask: l.ask }), 'ask', {} as any);
    assert.equal(d.allowed, false);
    assert.equal(d.reason, 'job_limit');
    assert.match(d.message!, /ask/);
    assert.equal(evaluateBudget(day({ ask: l.ask }), 'decision', {} as any).allowed, true);
    assert.equal(evaluateBudget(day({ signals: l.signals }), 'signals', {} as any).allowed, false);
  });

  it('background jobs cannot consume interactive headroom', () => {
    // Raise background limits so only the shared-cap reservation can stop them.
    const env = { DAILY_BUDGET_SIGNALS: '100', DAILY_BUDGET_INGEST: '100' } as any;
    // ask 25 + decision 12 reserved = 37 -> background may use at most 13 of 50.
    assert.equal(evaluateBudget(day({ ingest: 12 }), 'signals', env).allowed, true);
    const blocked = evaluateBudget(day({ ingest: 13 }), 'signals', env);
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.reason, 'reserved_for_interactive');
    // Interactive jobs are unaffected by heavy background use.
    assert.equal(evaluateBudget(day({ ingest: 13, signals: 20 }), 'ask', env).allowed, true);
    // Interactive usage only moves entitlement from reserved to used, so background gains nothing from it.
    assert.equal(evaluateBudget(day({ ingest: 13, ask: 25 }), 'signals', env).allowed, false);
    // Lowering the interactive budget releases headroom to background jobs.
    assert.equal(evaluateBudget(day({ ingest: 13 }), 'signals', { ...env, DAILY_BUDGET_ASK: '10' } as any).allowed, true);
  });

  it('summarizeBudgets reports used vs limit per job', () => {
    const rows = summarizeBudgets(day({ ask: 3, signals: 3 }), {} as any);
    assert.deepEqual(rows.map((r) => r.job), ['ask', 'decision', 'signals', 'summary', 'ingest']);
    const sig = rows.find((r) => r.job === 'signals')!;
    assert.equal(sig.used, 3);
    assert.equal(sig.allowed, false);
    assert.equal(rows.find((r) => r.job === 'ask')!.kind, 'interactive');
  });
});

describe('guarded job calls', () => {
  it('counts requests per job and stops at the limit, then rolls over with the UTC day', async () => {
    const { store, rows } = fakeStore();
    const calls: JobName[] = [];
    const env = { ...ENV, DAILY_BUDGET_ASK: '2' } as NodeJS.ProcessEnv;
    const day1 = new Date('2026-11-19T23:59:00Z');
    const run = (now: Date) => runJobGuarded('ask', msgs, { env, store, now, run: okRun(calls) });
    assert.equal((await run(day1)).ok, true);
    assert.equal((await run(day1)).ok, true);
    assert.equal(rows.get(usageKey(day1))!.ask!.requests, 2);
    const third = await run(day1);
    assert.equal(third.ok, false);
    assert.equal(calls.length, 2, 'no request made when blocked');
    const day2 = new Date('2026-11-20T00:00:01Z');
    assert.equal((await run(day2)).ok, true);
    assert.equal(rows.get(usageKey(day2))!.ask!.requests, 1);
    assert.equal(rows.get(usageKey(day1))!.ask!.requests, 2);
  });

  it('over-budget background job skips the call and returns a typed skipped result', async () => {
    const { store } = fakeStore();
    const calls: JobName[] = [];
    const now = new Date('2026-11-19T10:00:00Z');
    await recordJobUsage('ingest', Array.from({ length: DEFAULT_DAILY_BUDGETS.ingest }, () => ({ model: 'm', ok: true })), store, now);
    const r = await runJobGuarded('ingest', msgs, { env: ENV, store, now, run: okRun(calls) });
    assert.equal(r.ok, false);
    assert.equal(r.skipped, true);
    if (r.skipped) {
      assert.equal(r.decision.reason, 'job_limit');
      assert.ok(r.message.length > 0);
    }
    assert.equal(calls.length, 0);
  });

  it('ingest job client throws BudgetExceededError (callers fall back) and sets lastSkip', async () => {
    const { store } = fakeStore();
    const now = new Date();
    await recordJobUsage('ingest', Array.from({ length: 99 }, () => ({ model: 'm', ok: true })), store, now);
    const client = createJobClient('ingest', { env: ENV, store, now, run: okRun([]) });
    await assert.rejects(client.call([{ content: 'x' }]), (e: unknown) => e instanceof BudgetExceededError);
    assert.equal(client.lastSkip?.job, 'ingest');
  });

  it('interactive ask is blocked only by its own limit, with a clear message; background load does not block it', async () => {
    const { store } = fakeStore();
    const now = new Date();
    await recordJobUsage('signals', Array.from({ length: 40 }, () => ({ model: 'm', ok: false })), store, now);
    await recordJobUsage('ingest', Array.from({ length: 40 }, () => ({ model: 'm', ok: false })), store, now);
    const ok = await runJobOrThrow('ask', msgs, { env: ENV, store, now, run: okRun([]) });
    assert.equal(ok.text, 'x');
    await recordJobUsage('ask', Array.from({ length: DEFAULT_DAILY_BUDGETS.ask }, () => ({ model: 'm', ok: true })), store, now);
    await assert.rejects(
      runJobOrThrow('ask', msgs, { env: ENV, store, now, run: okRun([]) }),
      (e: unknown) => e instanceof BudgetExceededError && /Daily ask request budget used up/.test(e.message),
    );
  });

  it('failed provider chains still count their attempts', async () => {
    const { store, rows } = fakeStore();
    const now = new Date();
    const failing = (async () => { throw Object.assign(new Error('x'), { attempts: [{ model: 'a', ok: false }, { model: 'b', ok: false }] }); }) as any;
    await assert.rejects(runJobGuarded('decision', msgs, { env: ENV, store, now, run: failing }));
    assert.equal(rows.get(usageKey(now))!.decision!.requests, 2);
  });

  it('store outage: interactive fails open, background fails closed', async () => {
    const broken: UsageStore = { load: async () => { throw new Error('db down'); }, record: async () => { throw new Error('db down'); } };
    const calls: JobName[] = [];
    assert.equal((await runJobGuarded('ask', msgs, { env: ENV, store: broken, run: okRun(calls) })).ok, true);
    const bg = await runJobGuarded('ingest', msgs, { env: ENV, store: broken, run: okRun(calls) });
    assert.equal(bg.skipped, true);
    assert.deepEqual(calls, ['ask']);
  });
});

describe('DECIDER_SIGNALS respects the signals budget', () => {
  const signals = [{ type: 'a', category: 'x' }, { type: 'b', category: 'y' }];
  it('over budget: keeps all signals and makes no request', async () => {
    const { store } = fakeStore();
    await recordJobUsage('signals', Array.from({ length: DEFAULT_DAILY_BUDGETS.signals }, () => ({ model: 'm', ok: true })), store);
    let fetched = 0;
    const fetchImpl = (async () => { fetched++; return new Response('{}'); }) as unknown as typeof fetch;
    const out = await applySignalImportance('content', signals, { env: { ...ENV, DECIDER_SIGNALS: '1' } as any, fetchImpl, store });
    assert.deepEqual(out, signals);
    assert.equal(fetched, 0);
  });
  it('under budget: calls the Decider and records each request', async () => {
    const { store, rows } = fakeStore();
    const fetchImpl = (async () => new Response(JSON.stringify({ model: 'm', answers: { s0: { type: 'noul', noul: 0.9 }, s1: { type: 'noul', noul: 0.01 } } }))) as unknown as typeof fetch;
    const out = await applySignalImportance('content', signals, { env: { ...ENV, DECIDER_SIGNALS: '1' } as any, fetchImpl, store });
    assert.equal(out.length, 1);
    assert.equal(rows.get(usageKey())!.signals!.requests, 1);
  });
});

describe('routing honesty', () => {
  it('OpenRouter path returns the real chain model, floor pins the cheap end', () => {
    const chain = getChain('decision', ENV);
    assert.equal(selectModel({ contextSize: 100 }, ENV), chain[0]);
    assert.equal(selectModel({ contextSize: 1 }, ENV), chain[chain.length - 1]);
    const floored = { ...ENV, COGNITIVE_MODEL_FLOOR: 'mini' } as NodeJS.ProcessEnv;
    assert.equal(selectModel({ contextSize: 100, complex: true }, floored), chain[chain.length - 1]);
    assert.equal(selectReasonerModel(ENV), chain[chain.length - 1]);
  });
  it('legacy path keeps gpt tier names without an OpenRouter key', () => {
    assert.equal(selectModel({ contextSize: 100 }, {} as any), 'gpt-4o');
    assert.equal(selectModel({ contextSize: 1 }, {} as any), 'gpt-4o-mini');
    assert.equal(selectModel({ contextSize: 100, complex: true }, { COGNITIVE_MODEL_FLOOR: 'mini' } as any), 'gpt-4o-mini');
  });
  it('openRouterEnvForModel puts the chosen model first', () => {
    const chain = getChain('decision', ENV);
    const env = openRouterEnvForModel(chain[2], ENV)!;
    assert.equal(env.DECISION_MODELS!.split(',')[0], chain[2]);
    assert.equal(openRouterEnvForModel(chain[0], ENV), undefined);
  });
});
