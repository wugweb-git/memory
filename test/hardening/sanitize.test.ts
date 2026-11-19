import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sanitize } from '../../src/lib/cognitive/sanitize.ts';

describe('L3 sanitize (hallucination guard)', () => {
  it('strips markdown fences and parses JSON', () => {
    const out = sanitize('```json\n{"recommendations":["a"],"confidence":0.7,"reasoning":"ok"}\n```');
    assert.deepEqual(out.recommendations, ['a']);
    assert.equal(out.confidence, 0.7);
    assert.equal(out.reasoning, 'ok');
  });

  it('clamps confidence into [0,1] and defaults non-numbers', () => {
    assert.equal(sanitize('{"confidence": 9}').confidence, 1);
    assert.equal(sanitize('{"confidence": -3}').confidence, 0);
    assert.equal(sanitize('{"confidence": "high"}').confidence, 0.5);
  });

  it('caps lists at 5 and coerces non-arrays to empty', () => {
    const out = sanitize(JSON.stringify({ recommendations: [1, 2, 3, 4, 5, 6, 7], gaps: 'nope' }));
    assert.equal(out.recommendations.length, 5);
    assert.deepEqual(out.gaps, []);
  });

  it('accepts singular "opportunity" alias', () => {
    assert.deepEqual(sanitize('{"opportunity":["x"]}').opportunities, ['x']);
  });

  it('throws SCHEMA_VIOLATION on unparseable output', () => {
    assert.throws(() => sanitize('I think you should post more'), /SCHEMA_VIOLATION/);
  });
});
