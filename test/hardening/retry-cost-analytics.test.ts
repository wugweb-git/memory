import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { backoffMs, decideRetry, MAX_RETRY_ATTEMPTS } from '../../src/lib/queue/retry.ts';
import { aggregateContentAnalytics, extractMetrics } from '../../src/lib/analytics/content.ts';
import { detectAiLikelihood, detectProvenanceSignal } from '../../src/lib/provenance/detection.ts';
import { applyAttempts, summarizeUsage, freeDailyCap } from '../../src/lib/cost/tracking.ts';
import { withinFreeCap } from '../../src/lib/cost/budget.ts';

describe('retry policy', () => {
  it('backs off exponentially and caps', () => {
    assert.equal(backoffMs(1), 120_000);
    assert.equal(backoffMs(3), 480_000);
    assert.equal(backoffMs(20), 3_600_000);
  });
  it('retries then dead-letters at the max', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    const r = decideRetry(0, now);
    assert.equal(r.action, 'retry');
    assert.equal(r.attempts, 1);
    assert.equal(decideRetry(MAX_RETRY_ATTEMPTS - 1, now).action, 'dead');
  });
});

describe('content analytics aggregation', () => {
  it('prefers newest snapshot, falls back to analytics blob', () => {
    const out = aggregateContentAnalytics(
      [
        { platform: 'linkedin', externalId: 'a', analytics: { impressions: 1 } },
        { platform: 'x', externalId: 'b', analytics: { impressions: 100, likes: 10 } },
        { platform: 'x', externalId: null, analytics: null },
      ],
      [
        { platform: 'linkedin', externalPostId: 'a', payload: { metrics: { impressions: 50, likes: 5 } }, createdAt: new Date(2) },
        { platform: 'linkedin', externalPostId: 'a', payload: { impressions: 10 }, createdAt: new Date(1) },
      ],
    );
    assert.equal(out.totalPublished, 3);
    assert.deepEqual(out.byPlatform, { linkedin: 1, x: 2 });
    assert.equal(out.engagement.totals.impressions, 150);
    assert.equal(out.engagement.totals.likes, 15);
    assert.equal(out.engagement.postsWithMetrics, 2);
    assert.equal(out.engagement.engagementRate, 0.1);
  });
  it('ignores non-numeric metrics', () => {
    assert.deepEqual(extractMetrics({ impressions: 'x', likes: -1 }), {});
  });
});

describe('ai likelihood heuristic', () => {
  const ai = "In today's world, it is important to note that we must delve into the ever-evolving landscape. Moreover, the tapestry of innovation is a testament to progress. Furthermore, businesses should leverage synergy. Additionally, organizations navigate the complexities of change. In conclusion, success requires effort and focus.";
  const human = "I tried this last week and honestly it didn't work. We shipped it anyway, which was dumb. My co-founder hated it; I couldn't blame him. Then a customer emailed us at 2am — said it saved her whole afternoon! So who knows. I'm still not sure we were right, but I'd do it again, and probably will next month when the pricing thing lands.";
  it('scores stock-LLM prose higher than casual human prose', () => {
    const a = detectAiLikelihood(ai);
    const h = detectAiLikelihood(human);
    assert.ok(a.aiProbability > h.aiProbability + 0.2, `${a.aiProbability} vs ${h.aiProbability}`);
    assert.ok(h.signals.contractions < 0);
    assert.equal(Number((a.aiProbability + a.humanProbability).toFixed(3)), 1);
  });
  it('returns low confidence for short text', () => {
    assert.equal(detectAiLikelihood('hi there').confidence, 'low');
  });
  it('blocks learning on unverified AI-looking text', () => {
    const r = detectProvenanceSignal({ aiProbability: 0.8, humanProbability: 0.2, verifiedHuman: false });
    assert.equal(r.allowLearning, false);
  });
});

describe('cost tracking', () => {
  it('aggregates attempts per job against the cap', () => {
    let day = applyAttempts({}, 'ask', [{ model: 'm1', ok: false }, { model: 'm2', ok: true }]);
    day = applyAttempts(day, 'summary', [{ model: 'm1', ok: true }]);
    const s = summarizeUsage(day, 50);
    assert.equal(s.used, 3);
    assert.equal(s.remaining, 47);
    assert.equal(day.ask?.failed, 1);
    assert.equal(day.ask?.byModel.m1, 1);
  });
  it('cap defaults to 50 and honours env', () => {
    assert.equal(freeDailyCap({} as NodeJS.ProcessEnv), 50);
    assert.equal(freeDailyCap({ OPENROUTER_FREE_DAILY_CAP: '1000' } as NodeJS.ProcessEnv), 1000);
    const full = applyAttempts({}, 'ask', Array.from({ length: 50 }, () => ({ model: 'm', ok: true })));
    assert.equal(withinFreeCap(full, {} as NodeJS.ProcessEnv).allowed, false);
  });
});
