import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { processDecision } from '../../src/lib/cognitive/orchestrator.ts';
import { selectModel } from '../../src/lib/cognitive/routing.ts';
import { maybeTriggerCognitiveRun } from '../../src/lib/cognitive/signal-trigger.ts';
import { parseItems, parseFeedback, parseMode, resolveUserId } from '../../src/lib/cognitive/validation.ts';

const ctx = {
  entities: [{ name: 'Acme', type: 'company', occurrences: 4 }],
  signals: [{ type: 'shipping', category: 'technical', intensity_absolute: 0.95 }],
  relationships: [],
  recent_decisions: [],
  intelligence: {},
};
const decisionJson = JSON.stringify({
  recommendations: ['Follow up with Acme on shipping'], priorities: [], gaps: [], opportunities: [],
  confidence: 0.8, reasoning: 'ok',
});

function harness(over: Record<string, any> = {}) {
  const calls = { single: 0, reasoner: 0, decision: 0, tiers: [] as string[], logged: 0 };
  const deps = {
    buildContext: async () => ctx,
    runLLMWithMeta: async () => { calls.single++; return { text: decisionJson, model: 'm' }; },
    runReasoner: async () => { calls.reasoner++; return 'analysis'; },
    runDecisionAgent: async (p: any) => { calls.decision++; calls.tiers.push(p.modelName); return decisionJson; },
    logDecision: async () => { calls.logged++; return 'log-1'; },
    ...over,
  } as any;
  return { calls, deps };
}

const KEYS = ['COGNITIVE_MULTI_AGENT', 'COGNITIVE_MODEL_FLOOR', 'DECIDER_MODE'];
let saved: Record<string, string | undefined> = {};
beforeEach(() => { saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]])); KEYS.forEach((k) => delete process.env[k]); });
afterEach(() => { KEYS.forEach((k) => (saved[k] === undefined ? delete process.env[k] : (process.env[k] = saved[k]))); });

describe('orchestrator flag paths', () => {
  it('default is the verified single pass', async () => {
    const { calls, deps } = harness();
    const r: any = await processDecision({ userId: 'u', mode: 'operator' }, deps);
    assert.equal(r.decision_id, 'log-1');
    assert.deepEqual([calls.single, calls.reasoner, calls.decision, calls.logged], [1, 0, 0, 1]);
  });

  it('COGNITIVE_MULTI_AGENT=1 runs reasoner then decision, skipping single pass', async () => {
    process.env.COGNITIVE_MULTI_AGENT = '1';
    const { calls, deps } = harness();
    const r: any = await processDecision({ userId: 'u', mode: 'operator' }, deps);
    assert.equal(r.recommendations.length, 1);
    assert.deepEqual([calls.single, calls.reasoner, calls.decision], [0, 1, 1]);
  });

  it('multi-agent failure falls back to single pass', async () => {
    process.env.COGNITIVE_MULTI_AGENT = '1';
    const { calls, deps } = harness({ runReasoner: async () => { throw new Error('LLM_FAILURE: x'); } });
    const r: any = await processDecision({ userId: 'u', mode: 'operator' }, deps);
    assert.equal(r.decision_id, 'log-1');
    assert.equal(calls.single, 1);
  });

  it('COGNITIVE_MODEL_FLOOR=mini pins the decision agent to the mini tier even for complex input', async () => {
    process.env.COGNITIVE_MULTI_AGENT = '1';
    const a = harness();
    await processDecision({ userId: 'u', mode: 'operator', external_input: 'evaluate this JD' }, a.deps);
    assert.deepEqual(a.calls.tiers, ['gpt-4o']);
    process.env.COGNITIVE_MODEL_FLOOR = 'mini';
    const b = harness();
    await processDecision({ userId: 'u', mode: 'operator', external_input: 'evaluate this JD' }, b.deps);
    assert.deepEqual(b.calls.tiers, ['gpt-4o-mini']);
    assert.equal(selectModel({ contextSize: 100, complex: true }), 'gpt-4o-mini');
  });

  it('returns insufficient_data without calling the LLM when memory is empty', async () => {
    const { calls, deps } = harness({ buildContext: async () => ({ ...ctx, entities: [], signals: [] }) });
    const r: any = await processDecision({ userId: 'u', mode: 'operator' }, deps);
    assert.equal(r.status, 'insufficient_data');
    assert.equal(calls.single + calls.reasoner, 0);
  });
});

describe('signal-spike trigger', () => {
  const env = (v: string | undefined) => ({ COGNITIVE_SIGNAL_TRIGGER: v }) as NodeJS.ProcessEnv;
  const spike = [{ intensity_absolute: 0.95 }];
  function deps(allow: boolean[] = [true, true], run?: () => Promise<any>) {
    const keys: string[] = []; let runs = 0;
    return {
      keys, get runs() { return runs; },
      d: {
        checkRateLimit: async (k: string) => { keys.push(k); return { allowed: allow[keys.length - 1] ?? true }; },
        run: run ?? (async () => { runs++; return { decision_id: 'd1' }; }),
      },
    };
  }

  it('is off unless the flag is 1, for non-PROD runs, and for calm signals', async () => {
    const h = deps();
    assert.deepEqual(await maybeTriggerCognitiveRun({ userId: 'u', signals: spike, testRunId: 'PROD' }, { env: env(undefined), deps: h.d }), { triggered: false, reason: 'disabled' });
    assert.equal((await maybeTriggerCognitiveRun({ userId: 'u', signals: spike, testRunId: 'T1' }, { env: env('1'), deps: h.d }) as any).reason, 'not_prod');
    assert.equal((await maybeTriggerCognitiveRun({ userId: 'u', signals: [{ intensity_absolute: 0.5 }], testRunId: 'PROD' }, { env: env('1'), deps: h.d }) as any).reason, 'no_spike');
    assert.equal(h.runs, 0);
  });

  it('runs once on a spike', async () => {
    const h = deps();
    const r = await maybeTriggerCognitiveRun({ userId: 'u', signals: spike, testRunId: 'PROD' }, { env: env('1'), deps: h.d });
    assert.deepEqual(r, { triggered: true, decisionId: 'd1' });
    assert.equal(h.runs, 1);
  });

  it('dedupes within the hour and honours the daily cap', async () => {
    const a = deps([false]);
    assert.equal((await maybeTriggerCognitiveRun({ userId: 'u', signals: spike, testRunId: 'PROD' }, { env: env('1'), deps: a.d }) as any).reason, 'deduped');
    const b = deps([true, false]);
    assert.equal((await maybeTriggerCognitiveRun({ userId: 'u', signals: spike, testRunId: 'PROD' }, { env: env('1'), deps: b.d }) as any).reason, 'daily_cap');
    assert.equal(a.runs + b.runs, 0);
  });

  it('never throws: run errors and timeouts are swallowed', async () => {
    const e = deps([true, true], async () => { throw new Error('boom'); });
    assert.equal((await maybeTriggerCognitiveRun({ userId: 'u', signals: spike, testRunId: 'PROD' }, { env: env('1'), deps: e.d }) as any).reason, 'error');
    const t = deps([true, true], () => new Promise(() => {}));
    assert.equal((await maybeTriggerCognitiveRun({ userId: 'u', signals: spike, testRunId: 'PROD' }, { env: env('1'), deps: t.d, timeoutMs: 20 }) as any).reason, 'timeout');
  });
});

describe('cognitive route validation', () => {
  it('validates items, mode, feedback and identity', () => {
    assert.equal(parseItems([]).ok, false);
    assert.equal(parseItems(Array(11).fill('x')).ok, false);
    assert.equal(parseItems([1]).ok, false);
    assert.equal(parseItems(['a', 'b']).ok, true);
    assert.equal(parseMode('hacker').ok, false);
    assert.deepEqual(parseMode(undefined), { ok: true, value: 'architect' });
    assert.equal(parseFeedback({ decisionId: 'd', feedbackType: 'maybe' }).ok, false);
    assert.equal(parseFeedback({ decisionId: 'd', feedbackType: 'accepted', comment: 'x'.repeat(3000) }).ok, false);
    assert.equal(parseFeedback({ decisionId: 'd', feedbackType: 'accepted' }).ok, true);
    assert.deepEqual(resolveUserId({}, 's'), { ok: true, value: 's' });
    const bad: any = resolveUserId({ user_id: 'other' }, 's');
    assert.equal(bad.status, 403);
  });
});
