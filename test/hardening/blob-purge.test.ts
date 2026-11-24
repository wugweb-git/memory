import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Purge_Blob_Item } from '../../src/lib/blobLayer';

function makeDb(opts: { blob?: { id: string; file_ref: string | null } | null; packets?: string[] } = {}) {
  const calls: string[] = [];
  let audit: any = null;
  const blob = opts.blob === undefined ? { id: 'b1', file_ref: null } : opts.blob;
  const tx: any = {
    blobItem: {
      findUnique: async () => blob,
      delete: async () => { calls.push('blob.delete'); },
    },
    memoryPacket: {
      findMany: async () => (opts.packets ?? []).map((id) => ({ id })),
      deleteMany: async () => { calls.push('packet.deleteMany'); },
    },
    embedding: { deleteMany: async () => { calls.push('embedding.deleteMany'); return { count: 4 }; } },
    provenanceRecord: { deleteMany: async () => { calls.push('provenance.deleteMany'); return { count: 2 }; } },
    signal: { deleteMany: async () => { calls.push('signal.deleteMany'); } },
    activityStream: { deleteMany: async () => { calls.push('activity.deleteMany'); } },
    executionAuditLog: { create: async (a: any) => { audit = a.data; calls.push('audit.create'); } },
  };
  let committed = false;
  const db: any = {
    $transaction: async (fn: any) => {
      const out = await fn(tx);
      committed = true;
      return out;
    },
  };
  return { db, calls, get audit() { return audit; }, get committed() { return committed; } };
}

test('purge deletes the row, derived packets, embeddings and provenance in one transaction', async () => {
  const h = makeDb({ packets: ['p1', 'p2'] });
  const now = new Date('2026-06-01T00:00:00Z');
  const r = await Purge_Blob_Item('b1', { db: h.db, now });
  assert.equal(h.committed, true);
  assert.deepEqual(h.calls, [
    'embedding.deleteMany', 'provenance.deleteMany', 'signal.deleteMany', 'activity.deleteMany',
    'packet.deleteMany', 'blob.delete', 'audit.create',
  ]);
  assert.equal(r.state, 'purged');
  assert.equal(r.id, 'b1');
  assert.equal(r.purged, true);
  assert.deepEqual(r.removed, { blob_items: 1, memory_packets: 2, embeddings: 4, provenance_records: 2 });
});

test('purge keeps only id and time in the audit record, never content', async () => {
  const h = makeDb();
  await Purge_Blob_Item('b1', { db: h.db, now: new Date('2026-06-01T00:00:00Z') });
  assert.deepEqual(h.audit, {
    eventType: 'blob:purge',
    status: 'ok',
    payload: { blob_id: 'b1', purged_at: '2026-06-01T00:00:00.000Z' },
  });
  assert.equal(h.calls.includes('packet.deleteMany'), false);
});

test('purge of an unknown item throws and writes nothing', async () => {
  const h = makeDb({ blob: null });
  await assert.rejects(() => Purge_Blob_Item('nope', { db: h.db }), /not found/);
  assert.deepEqual(h.calls, []);
});

test('purge deletes a stored Vercel Blob file, ignores foreign URLs, and survives delete failures', async () => {
  const deleted: string[] = [];
  const url = 'https://abc.public.blob.vercel-storage.com/x.json';
  await Purge_Blob_Item('b1', { db: makeDb({ blob: { id: 'b1', file_ref: url } }).db, deleteFile: async (u) => { deleted.push(u); } });
  await Purge_Blob_Item('b1', { db: makeDb({ blob: { id: 'b1', file_ref: 'https://evil.example.com/x' } }).db, deleteFile: async (u) => { deleted.push(u); } });
  assert.deepEqual(deleted, [url]);
  const r = await Purge_Blob_Item('b1', {
    db: makeDb({ blob: { id: 'b1', file_ref: url } }).db,
    deleteFile: async () => { throw new Error('storage down'); },
  });
  assert.equal(r.state, 'purged');
});
