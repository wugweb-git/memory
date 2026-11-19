import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hashContent, listProvenance, recordProvenance } from '../../src/lib/provenance/ledger.ts';
import { scoreAiContamination } from '../../src/lib/persona/fingerprint.ts';

describe('provenance hardening', () => {
  it('flags obvious AI phrase contamination', () => {
    const result = scoreAiContamination(
      'In today\'s world we must delve into leverage and moreover in conclusion.',
    );
    assert.ok(result.aiProbability > 0.3);
    assert.ok(result.humanProbability < 0.8);
  });

  function fakeDb() {
    const rows: any[] = [];
    return {
      rows,
      provenanceRecord: {
        findFirst: async ({ where }: any) =>
          rows.find((r) => r.subjectType === where.subjectType && r.subjectId === where.subjectId && r.contentHash === where.contentHash) ?? null,
        create: async ({ data }: any) => { const r = { id: `r${rows.length + 1}`, ...data }; rows.push(r); return r; },
        findMany: async (args: any) => { (fakeDb as any).last = args; return rows; },
      },
    };
  }
  const p = { userId: 'u1', subjectType: 'output' as const, subjectId: 'o1', text: 'Moreover, we delve into it.', source: 'test' };

  it('ledger records a detection result', async () => {
    const db = fakeDb();
    const r = await recordProvenance(p, db);
    assert.equal(r.contentHash, hashContent(p.text));
    assert.equal(r.confidence, 'low');
    assert.ok(r.aiLikelihood > 0.3);
    assert.equal(db.rows.length, 1);
  });

  it('ledger is idempotent per subject+content, new content adds a row', async () => {
    const db = fakeDb();
    await recordProvenance(p, db);
    await recordProvenance(p, db);
    assert.equal(db.rows.length, 1);
    await recordProvenance({ ...p, text: 'different text' }, db);
    assert.equal(db.rows.length, 2);
  });

  it('ledger never throws into callers', async () => {
    const bad = { provenanceRecord: { findFirst: async () => { throw new Error('db down'); }, create: async () => null, findMany: async () => [] } };
    assert.equal(await recordProvenance(p, bad), null);
  });

  it('listProvenance clamps limit and filters', async () => {
    const db = fakeDb();
    await listProvenance({ userId: 'u1', limit: 9999 }, db);
    assert.equal((fakeDb as any).last.take, 200);
    assert.equal((fakeDb as any).last.where.userId, 'u1');
  });
});
