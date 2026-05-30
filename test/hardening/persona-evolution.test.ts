import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { scoreAiContamination } from '../../src/lib/persona/fingerprint.ts';

describe('persona evolution guards', () => {
  it('marks natural prose as more human than boilerplate', () => {
    const natural = scoreAiContamination(
      'We shipped the profile editor last week. The team kept the API small and tested publish flows manually.',
    );
    const boilerplate = scoreAiContamination(
      'In today\'s world, it is important to note that we must leverage synergies. Moreover, in conclusion.',
    );
    assert.ok(natural.humanProbability > boilerplate.humanProbability);
  });

  it('caps AI probability below 1', () => {
    const extreme = scoreAiContamination(
      'as an ai leverage delve into moreover furthermore in conclusion additionally',
    );
    assert.ok(extreme.aiProbability <= 0.98);
  });
});
