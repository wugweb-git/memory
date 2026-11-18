import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyMark, formatNoteDate, parseNotes, pruneSelection, rollbackMark,
  selectAllState, summarise, toggleId, toggleSelectAll,
} from '../../src/lib/memory/public-curation.ts';

const notes = parseNotes({
  packets: [
    { id: 'a', type: 'text', source: 'blob', ingestion_time: '2026-11-01T10:00:00Z', is_public: true, preview: 'one' },
    { id: 'b', type: 'text', source: 'blob', ingestion_time: null, is_public: false, preview: 'two' },
    { id: 'c', is_public: false },
    null, { id: '' }, { type: 'x' },
  ],
});

describe('public notes curation helpers', () => {
  it('parses tolerantly and drops malformed rows', () => {
    assert.equal(notes.length, 3);
    assert.equal(notes[2].type, 'note');
    assert.equal(notes[2].source, 'unknown');
    assert.deepEqual(parseNotes(undefined), []);
    assert.deepEqual(parseNotes({ packets: 'nope' }), []);
  });
  it('applies and rolls back an optimistic mark without mutating', () => {
    const ids = new Set(['b', 'c']);
    const next = applyMark(notes, ids, true);
    assert.deepEqual(next.map((n) => n.is_public), [true, true, true]);
    assert.equal(notes[1].is_public, false);
    const back = rollbackMark(next, notes, ids);
    assert.deepEqual(back.map((n) => n.is_public), [true, false, false]);
  });
  it('toggles single ids and select-all', () => {
    assert.deepEqual([...toggleId(new Set(), 'a')], ['a']);
    assert.deepEqual([...toggleId(new Set(['a']), 'a')], []);
    assert.equal(selectAllState(notes, new Set()), 'none');
    assert.equal(selectAllState(notes, new Set(['a'])), 'some');
    assert.equal(selectAllState(notes, new Set(['a', 'b', 'c'])), 'all');
    assert.equal(selectAllState([], new Set()), 'none');
    assert.equal(toggleSelectAll(notes, new Set(['a'])).size, 3);
    assert.equal(toggleSelectAll(notes, new Set(['a', 'b', 'c'])).size, 0);
  });
  it('prunes selection to visible notes', () => {
    assert.deepEqual([...pruneSelection(notes, new Set(['a', 'zzz']))], ['a']);
  });
  it('summarises and formats dates', () => {
    assert.equal(summarise(notes), '1 of 3 public');
    assert.equal(formatNoteDate('2026-11-01T10:00:00Z'), '2026-11-01');
    assert.equal(formatNoteDate(null), 'No date');
    assert.equal(formatNoteDate('garbage'), 'No date');
  });
});
