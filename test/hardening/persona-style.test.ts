import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('persona style enforcement', () => {
  it('does not delete auxiliary verbs (grammar preserved)', async () => {
    const { enforcePersonaStyle } = await import('../../src/lib/persona/style.ts');
    const text = 'The report was approved and the plan is finished.';
    const r = enforcePersonaStyle({ content: text, confidence: 0.8 });
    assert.equal(r.content, text);
    assert.equal(r.applied, false);
    assert.ok(r.changes.some((c: string) => c.startsWith('flagged_')));
  });

  it('skips enforcement at low confidence', async () => {
    const { enforcePersonaStyle } = await import('../../src/lib/persona/style.ts');
    const r = enforcePersonaStyle({ content: 'x', confidence: 0.3 });
    assert.equal(r.reason, 'low_confidence');
  });
});

describe('fingerprint length gate', () => {
  it('long plain human text is still verified human', async () => {
    const { scoreAiContamination } = await import('../../src/lib/persona/fingerprint.ts');
    const text = 'I fixed the bug today and it was fun. '.repeat(60);
    assert.ok(text.length > 2000);
    assert.equal(scoreAiContamination(text).verifiedHuman, true);
  });

  it('AI phrases still lower the verdict', async () => {
    const { scoreAiContamination } = await import('../../src/lib/persona/fingerprint.ts');
    const r = scoreAiContamination('Moreover, let us delve into leverage. Furthermore, in conclusion, additionally.');
    assert.equal(r.verifiedHuman, false);
  });
});
