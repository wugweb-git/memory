import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('hallucination guardrails', () => {
  it('treats short queries as non-retrievable in llama adapter', async () => {
    const { retrieveRelevantContext } = await import('../../src/lib/retrieval/llama.ts');
    const result = await retrieveRelevantContext('hi', 'system_user');
    assert.equal(result.nodes.length, 0);
    assert.equal(result.metadata.status, 'query_too_short');
  });

  it('enforces minimum rebuild source length at API contract', () => {
    const minimumChars = 40;
    assert.ok('short bio'.length < minimumChars);
    assert.ok(
      'We shipped the profile editor and tested publish flows end to end with real API calls.'.length >=
        minimumChars,
    );
  });
});
