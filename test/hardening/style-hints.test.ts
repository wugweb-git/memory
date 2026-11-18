import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildStyleHints } from '../../src/lib/persona/styleHints.ts';

describe('buildStyleHints', () => {
  it('returns empty for missing or low-confidence persona', () => {
    assert.equal(buildStyleHints(null), '');
    assert.equal(buildStyleHints({ confidenceScore: 0.2, communicationStyle: { tone: 'direct' } }), '');
  });

  it('builds a capped soft hint from confident fields only', () => {
    const out = buildStyleHints({
      confidenceScore: 0.7,
      communicationStyle: { tone: 'direct', junk: { a: 1 } },
      writingStyle: { keywords: ['concise', 'punchy'] },
      traits: [
        { trait: 'analytical', score: 0.9, confidence: 0.8 },
        { trait: 'reactive', score: 0.99, confidence: 0.1 },
      ],
    });
    assert.match(out, /^STYLE HINTS/);
    assert.match(out, /soft style preferences only/);
    assert.match(out, /context nodes/);
    assert.match(out, /direct/);
    assert.match(out, /analytical/);
    assert.doesNotMatch(out, /reactive|junk|\{/);
    assert.ok(out.length <= 600);
  });
});
