import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeSourceTrust } from '../../src/lib/provenance/trust.ts';
import { humanAuthenticityScore } from '../../src/lib/provenance/scoring.ts';
import { scoreAiContamination } from '../../src/lib/persona/fingerprint.ts';

describe('provenance hardening', () => {
  it('computes weighted source trust', () => {
    const trust = computeSourceTrust({ historicalAccuracy: 0.9, humanAuthenticity: 0.7 });
    assert.equal(trust, 0.82);
  });

  it('boosts verified human authenticity scores', () => {
    assert.equal(humanAuthenticityScore(0.6, false), 0.6);
    assert.equal(humanAuthenticityScore(0.6, true), 0.7);
  });

  it('flags obvious AI phrase contamination', () => {
    const result = scoreAiContamination(
      'In today\'s world we must delve into leverage and moreover in conclusion.',
    );
    assert.ok(result.aiProbability > 0.3);
    assert.ok(result.humanProbability < 0.8);
  });
});
