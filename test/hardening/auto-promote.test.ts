import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AUTO_PROMOTE_KEY,
  autoPromoteFor,
  getAutoPromoteMode,
  parseAutoPromoteBody,
  setAutoPromoteMode,
  shouldAutoPromote,
  type AutoPromoteStore,
} from '../../src/lib/ingestion/connectors/auto-promote.ts';
import { ingestItems } from '../../src/lib/connectors/sync-items.ts';

function memStore(initial: unknown = null): AutoPromoteStore & { value: unknown } {
  const s = {
    value: initial,
    async get() { return s.value; },
    async set(v: unknown) { s.value = v; },
  };
  return s;
}

describe('auto-promote setting', () => {
  it('uses the scheduler_state key and defaults to off', async () => {
    assert.equal(AUTO_PROMOTE_KEY, 'setting:auto-promote-sync');
    assert.equal(await getAutoPromoteMode(memStore(null)), 'off');
    assert.equal(await getAutoPromoteMode(memStore({ mode: 'bogus' })), 'off');
    assert.equal(await getAutoPromoteMode({ get: async () => { throw new Error('db down'); }, set: async () => {} }), 'off');
  });

  it('round-trips a saved mode', async () => {
    const st = memStore();
    await setAutoPromoteMode('trusted', st);
    assert.deepEqual(st.value, { mode: 'trusted' });
    assert.equal(await getAutoPromoteMode(st), 'trusted');
  });

  it('off never promotes', () => {
    for (const id of ['github', 'gmail', 'notion', 'feed-abc']) assert.equal(shouldAutoPromote('off', id), false, id);
  });

  it('trusted promotes low-risk connectors only, never gmail', () => {
    for (const id of ['github', 'youtube', 'blog', 'notion', 'spotify', 'google-calendar', 'google-calendar-events', 'google-tasks']) {
      assert.equal(shouldAutoPromote('trusted', id), true, id);
    }
    for (const id of ['gmail', 'google-drive', 'feed-abc', 'linkedin', 'voice']) {
      assert.equal(shouldAutoPromote('trusted', id), false, id);
    }
  });

  it('all promotes everything including gmail', () => {
    for (const id of ['gmail', 'github', 'google-drive', 'feed-abc']) assert.equal(shouldAutoPromote('all', id), true, id);
  });

  it('autoPromoteFor reads the stored mode per connector', async () => {
    assert.equal(await autoPromoteFor('github', memStore(null)), false);
    assert.equal(await autoPromoteFor('gmail', memStore({ mode: 'trusted' })), false);
    assert.equal(await autoPromoteFor('github', memStore({ mode: 'trusted' })), true);
    assert.equal(await autoPromoteFor('gmail', memStore({ mode: 'all' })), true);
  });

  it('validates the PUT body', () => {
    assert.deepEqual(parseAutoPromoteBody({ mode: 'all' }), { ok: true, mode: 'all' });
    for (const bad of [null, {}, { mode: 'ALL' }, { mode: 1 }, { mode: '' }, 'all']) {
      assert.equal(parseAutoPromoteBody(bad).ok, false, JSON.stringify(bad));
    }
  });
});

describe('ingestItems promotion', () => {
  const items = [
    { sourceId: 'a', type: 't', payload: { x: 1 } },
    { sourceId: 'b', type: 't', payload: { x: 2 } },
  ];
  function harness(promote: (id: string) => Promise<unknown>) {
    const pushed: string[] = [];
    const promoted: string[] = [];
    let saved: any = null;
    const deps = {
      push: (async (p: any) => { pushed.push(p.source_id); return { id: `blob-${p.source_id}` }; }) as any,
      promote: async (id: string) => { promoted.push(id); return promote(id); },
      getState: async () => ({ lastSyncAt: null, lastError: null, lastResult: null, seen: [] }),
      saveState: async (_id: string, st: any) => { saved = st; },
    };
    return { deps, pushed, promoted, get saved() { return saved; } };
  }

  it('does not promote by default', async () => {
    const h = harness(async () => ({}));
    const r = await ingestItems({ connectorId: 'gmail', source: 'gmail', items, deps: h.deps });
    assert.equal(r.ingested, 2);
    assert.deepEqual(h.promoted, []);
  });

  it('promotes each new item when autoPromote is on', async () => {
    const h = harness(async () => ({}));
    await ingestItems({ connectorId: 'spotify', source: 'spotify', items, autoPromote: true, deps: h.deps });
    assert.deepEqual(h.promoted, ['blob-a', 'blob-b']);
  });

  it('a promotion failure keeps the buffered item and still counts it', async () => {
    const h = harness(async () => { throw new Error('embedding down'); });
    const r = await ingestItems({ connectorId: 'spotify', source: 'spotify', items, autoPromote: true, deps: h.deps });
    assert.deepEqual(h.pushed, ['a', 'b']);
    assert.equal(r.ingested, 2);
    assert.equal(r.error, undefined);
    assert.deepEqual(h.saved.seen, ['a', 'b']);
  });
});
