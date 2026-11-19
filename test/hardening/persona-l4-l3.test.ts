import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { derivePersonaView } from '../../src/lib/intelligence/resolver.ts';
import { buildPrompt } from '../../src/lib/cognitive/prompt/builder.ts';
import { compareTraitVectors, driftFromLogs, detectPersonaDrift } from '../../src/lib/persona/drift.ts';
import { orderChainForTier, isMiniTier } from '../../src/lib/cognitive/routing.ts';

describe('L4 -> L3 resolver contract', () => {
  it('reads the keys rebuild writes', () => {
    const v = derivePersonaView({
      profile: {
        displayName: 'Ada',
        communicationStyle: { directness: 0.7, synthesis: { summary: 'Direct builder.', voice: 'terse, sharp' } },
        writingStyle: {},
        decisionStyle: { sampleCount: 3, avgConfidence: 0.6, executionFocus: 0.8, analyticalDepth: 0.4 },
      },
      preferences: [],
    });
    assert.equal(v.bioSummary, 'Direct builder.');
    assert.equal(v.style, 'terse, sharp');
    assert.deepEqual(v.perspective, ['operator']);
  });

  it('legacy keys win and defaults apply', () => {
    const v = derivePersonaView({
      profile: { writingStyle: { bioSummary: 'Legacy' }, decisionStyle: { positioningKeywords: ['founder'] } },
      preferences: [{ category: 'voice', key: 'style', value: 'calm' }],
    });
    assert.equal(v.bioSummary, 'Legacy');
    assert.deepEqual(v.perspective, ['founder']);
    assert.equal(v.style, 'calm');
    assert.match(derivePersonaView({ profile: null, preferences: [] }).bioSummary, /early training/);
  });

  it('prompt USER INTELLIGENCE block is populated from the resolver shape', () => {
    const intelligence = {
      traits: [{ trait: 'directness', score: 0.7 }],
      preferences: [{ category: 'voice', key: 'style', value: 'calm' }],
      persona: { bio_summary: 'Direct builder.', voice: 'calm', perspective: ['operator'] },
    };
    const p = buildPrompt({ context: { entities: [], signals: [], intelligence }, history: [], mode: 'operator', modeInstruction: 'x' });
    assert.match(p, /directness/);
    assert.match(p, /Direct builder\./);
    assert.match(p, /"key":"style"/);
  });
});

describe('persona drift', () => {
  it('detects movement and ignores stability', () => {
    const still = compareTraitVectors({ a: 0.5, b: 0.5 }, { a: 0.52, b: 0.5 });
    assert.equal(still.drifted, false);
    const moved = compareTraitVectors({ a: 0.2, b: 0.8 }, { a: 0.7, b: 0.4 });
    assert.equal(moved.drifted, true);
    assert.equal(moved.changes[0].key, 'a');
  });

  it('computes drift from evolution logs (baseline = oldest oldValue)', () => {
    const t = (n: number) => new Date(2026, 0, n);
    const r = driftFromLogs([
      { changedField: 'decisionStyle', oldValue: { executionFocus: 0.2 }, newValue: { executionFocus: 0.3 }, createdAt: t(1) },
      { changedField: 'decisionStyle', oldValue: { executionFocus: 0.3 }, newValue: { executionFocus: 0.8 }, createdAt: t(5) },
    ]);
    assert.equal(r.drifted, true);
    assert.equal(r.fields.decisionStyle.changeCount, 2);
    assert.equal(r.fields.decisionStyle.maxDelta, 0.6);
    assert.equal(driftFromLogs([]).drifted, false);
    assert.equal(detectPersonaDrift(0.1, 0.5).drifted, true);
  });
});

describe('model routing under OpenRouter', () => {
  it('mini tier promotes the lightest model, full keeps order', () => {
    assert.deepEqual(orderChainForTier(['big', 'mid', 'small'], 'mini'), ['small', 'big', 'mid']);
    assert.deepEqual(orderChainForTier(['big', 'mid', 'small'], 'full'), ['big', 'mid', 'small']);
    assert.equal(isMiniTier('gpt-4o-mini'), true);
    assert.equal(isMiniTier('gpt-4o'), false);
  });
});
