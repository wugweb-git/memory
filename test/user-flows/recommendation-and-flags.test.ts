import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { scoreRecommendation } from '../../src/lib/recommendation/scoring.ts';
import { rankRecommendations } from '../../src/lib/recommendation/ranking.ts';
import { suppressNoise } from '../../src/lib/recommendation/suppression.ts';
import { leverageScore } from '../../src/lib/recommendation/leverage.ts';
import { detectFatigue } from '../../src/lib/recommendation/fatigue.ts';
import { detectTimingWindow } from '../../src/lib/recommendation/timing.ts';
import { featureEnabled } from '../../src/config/features.ts';
import { routeDistribution } from '../../src/lib/distribution/router.ts';

describe('recommendation primitives', () => {
  it('scores signal-weighted over confidence (0.7/0.3)', () => {
    assert.equal(scoreRecommendation(1, 0), 0.7);
    assert.equal(scoreRecommendation(0, 1), 0.3);
    assert.equal(scoreRecommendation(1, 1), 1);
  });

  it('ranks descending and suppresses below threshold', () => {
    const ranked = rankRecommendations([
      { id: 'low', score: 0.2 },
      { id: 'high', score: 0.9 },
      { id: 'mid', score: 0.5 },
    ]);
    assert.deepEqual(ranked.map((r) => r.id), ['high', 'mid', 'low']);
    assert.deepEqual(suppressNoise(ranked, 0.4).map((r) => r.id), ['high', 'mid']);
  });

  it('leverage rewards high impact per unit effort and guards divide-by-zero', () => {
    assert.equal(leverageScore(1, 0.5), 2);
    assert.ok(leverageScore(1, 0) <= 10, 'zero effort must not explode');
  });

  it('detects fatigue above the daily action load', () => {
    assert.equal(detectFatigue(10).fatigued, false);
    assert.equal(detectFatigue(30).fatigued, true);
  });

  it('opens a timing window only when urgent AND ready', () => {
    assert.equal(detectTimingWindow(0.9, 0.9), true);
    assert.equal(detectTimingWindow(0.9, 0.2), false);
    assert.equal(detectTimingWindow(0.2, 0.9), false);
  });
});

describe('feature flags', () => {
  it('treats untagged (core) and unknown keys as enabled', () => {
    assert.equal(featureEnabled(undefined), true);
    // @ts-expect-error unknown key falls back to enabled
    assert.equal(featureEnabled('nonexistent'), true);
  });

  it('reflects defaults for known modules', () => {
    for (const key of ['ask', 'memory', 'cognitive', 'career'] as const) {
      assert.equal(featureEnabled(key), true, key);
    }
  });
});

describe('distribution router', () => {
  it('builds platform payloads for supported targets', () => {
    for (const platform of ['linkedin', 'medium', 'portfolio']) {
      const out = routeDistribution({ platform, content: 'Hello world', title: 'T' });
      assert.ok(out, platform);
    }
  });

  it('rejects empty content and unsupported platforms', () => {
    assert.throws(() => routeDistribution({ platform: 'linkedin', content: '   ' }), /EMPTY_CONTENT/);
    assert.throws(() => routeDistribution({ platform: 'myspace', content: 'x' }), /UNSUPPORTED_PLATFORM/);
  });

  it('rejects malformed schedule timestamps', () => {
    assert.throws(
      () => routeDistribution({ platform: 'linkedin', content: 'x', scheduledAt: 'not-a-date' }),
      /INVALID_SCHEDULE/,
    );
  });
});
