import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { decideEvolution, evidenceStrength, hashEvidence } from '../../src/jobs/persona-evolution.ts';
import { textMatchesVector, needsUpdate } from '../../src/jobs/fingerprint-validation.ts';
import { scoreAiContamination } from '../../src/lib/persona/fingerprint.ts';

const base = { textLength: 500, hash: 'a', lastHash: null, strength: 0.6, verifiedHuman: true };

describe('persona-evolution decision', () => {
  it('runs on new verified evidence', () => assert.equal(decideEvolution(base).action, 'run'));
  it('skips short text', () =>
    assert.deepEqual(decideEvolution({ ...base, textLength: 10 }), { action: 'skip', reason: 'insufficient_source_text' }));
  it('skips when evidence hash unchanged (idempotent)', () =>
    assert.deepEqual(decideEvolution({ ...base, lastHash: 'a' }), { action: 'skip', reason: 'no_new_evidence' }));
  it('skips weak evidence and contamination', () => {
    assert.equal(decideEvolution({ ...base, strength: 0.3 }).action, 'skip');
    assert.deepEqual(decideEvolution({ ...base, verifiedHuman: false }), { action: 'skip', reason: 'ai_contamination_detected' });
  });
  it('hash is stable and strength is bounded', () => {
    assert.equal(hashEvidence('x'), hashEvidence('x'));
    assert.notEqual(hashEvidence('x'), hashEvidence('y'));
    assert.ok(evidenceStrength(100, 100) <= 1 && evidenceStrength(0, 0) >= 0.4);
  });
});

describe('fingerprint-validation logic', () => {
  const text = 'We shipped the profile editor last week and tested publish flows.';
  const vec = scoreAiContamination(text).styleVector;
  it('accepts only text that matches the stored vector', () => {
    assert.equal(textMatchesVector(text, vec), true);
    assert.equal(textMatchesVector('x'.repeat(vec.length), vec), false);
    assert.equal(textMatchesVector(text, null), false);
    assert.equal(textMatchesVector(text, {}), false);
  });
  it('needsUpdate is false for identical scores (idempotent)', () => {
    const r = scoreAiContamination(text);
    assert.equal(needsUpdate(r, r), false);
    assert.equal(needsUpdate({ ...r, verifiedHuman: !r.verifiedHuman }, r), true);
  });
});
