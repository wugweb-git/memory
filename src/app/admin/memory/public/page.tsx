'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/app/component/AppShell';
import { M3Card, M3Page, M3State } from '@/components/ui/m3';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import {
  applyMark,
  formatNoteDate,
  parseNotes,
  pruneSelection,
  rollbackMark,
  selectAllState,
  summarise,
  toggleId,
  toggleSelectAll,
  type PublicNote,
} from '@/lib/memory/public-curation';

const ENDPOINT = API_ENDPOINTS.memory.public.path;
const PAGE_LIMIT = 100;

const buttonBase =
  'min-h-11 px-4 py-2 rounded-xl text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-accent';

export default function PublicNotesPage() {
  const [notes, setNotes] = useState<PublicNote[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [onlyPublic, setOnlyPublic] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const notesRef = useRef<PublicNote[] | null>(null);
  notesRef.current = notes;

  const load = useCallback(async () => {
    setLoadError(null);
    setNotes(null);
    try {
      const qs = `?limit=${PAGE_LIMIT}${onlyPublic ? '&onlyPublic=1' : ''}`;
      const res = await fetch(`${ENDPOINT}${qs}`, { credentials: 'include' });
      if (res.status === 401 || res.status === 403) throw new Error('Admin login required. Sign in and refresh.');
      if (!res.ok) throw new Error(`Could not load notes (HTTP ${res.status}).`);
      const parsed = parseNotes(await res.json());
      setNotes(parsed);
      setSelected((prev) => pruneSelection(parsed, prev));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Could not load notes.');
    }
  }, [onlyPublic]);

  useEffect(() => {
    load();
  }, [load]);

  const mark = useCallback(
    async (isPublic: boolean) => {
      const current = notesRef.current;
      if (!current || selected.size === 0) return;
      const ids = new Set(selected);
      const snapshot = current;
      setBusy(true);
      setStatus(null);
      setNotes(applyMark(current, ids, isPublic)); // optimistic
      try {
        const res = await fetch(ENDPOINT, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: [...ids], isPublic }),
        });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(typeof j.error === 'string' ? j.error : `HTTP ${res.status}`);
        const updated = typeof j.updated === 'number' ? j.updated : ids.size;
        const skipped = ids.size - updated;
        setStatus({
          tone: 'success',
          text:
            `${updated} ${updated === 1 ? 'note' : 'notes'} made ${isPublic ? 'public' : 'private'}.` +
            (skipped > 0 ? ` ${skipped} skipped (restricted notes can never be public).` : ''),
        });
        setSelected(new Set());
        if (skipped > 0) load(); // resync so skipped notes show their real state
      } catch (e) {
        setNotes((now) => (now ? rollbackMark(now, snapshot, ids) : now));
        setStatus({ tone: 'error', text: `Change not saved: ${e instanceof Error ? e.message : 'unknown error'}. Reverted.` });
      } finally {
        setBusy(false);
      }
    },
    [selected, load],
  );

  const all = useMemo(() => (notes ? selectAllState(notes, selected) : 'none'), [notes, selected]);
  const selectAllRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = all === 'some';
  }, [all]);

  const count = notes?.length ?? 0;

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4">
        <M3Page title="Public notes" subtitle="Choose which memory notes the public Ask chat may quote. Owner only.">
          <p className="text-sm">
            <Link href="/admin" className="text-accent underline underline-offset-2">Back to admin</Link>
          </p>

          <M3Card title={notes ? summarise(notes) : 'Notes'}>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <label className="flex items-center gap-2 text-sm text-text-primary min-h-11">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  className="h-5 w-5 accent-accent"
                  checked={all === 'all'}
                  disabled={count === 0 || busy}
                  onChange={() => notes && setSelected(toggleSelectAll(notes, selected))}
                />
                Select all on page
              </label>
              <label className="flex items-center gap-2 text-sm text-text-primary min-h-11">
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-accent"
                  checked={onlyPublic}
                  disabled={busy}
                  onChange={(e) => setOnlyPublic(e.target.checked)}
                />
                Public only
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className={`${buttonBase} bg-accent text-white`}
                disabled={busy || selected.size === 0}
                onClick={() => mark(true)}
              >
                Make public
              </button>
              <button
                type="button"
                className={`${buttonBase} border border-border-primary text-text-primary bg-bg-primary`}
                disabled={busy || selected.size === 0}
                onClick={() => mark(false)}
              >
                Make private
              </button>
              <span className="text-xs text-text-tertiary" aria-live="polite">
                {selected.size} selected
              </span>
            </div>
            <p
              role={status?.tone === 'error' ? 'alert' : 'status'}
              className={`text-sm ${status?.tone === 'error' ? 'text-danger' : 'text-success'} ${status ? '' : 'sr-only'}`}
            >
              {status?.text ?? ''}
            </p>

            {loadError ? (
              <div className="space-y-2">
                <M3State state="error" message={loadError} />
                <button type="button" className={`${buttonBase} border border-border-primary text-text-primary`} onClick={load}>
                  Try again
                </button>
              </div>
            ) : notes === null ? (
              <M3State state="loading" message="Loading notes…" />
            ) : notes.length === 0 ? (
              <M3State
                state="empty"
                message={onlyPublic ? 'No public notes yet. Turn off the filter to pick some.' : 'No memory notes found.'}
              />
            ) : (
              <ul className="divide-y divide-border-secondary" aria-label="Memory notes">
                {notes.map((n) => {
                  const labelId = `note-${n.id}`;
                  return (
                    <li key={n.id} className="py-3">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          className="mt-1 h-5 w-5 shrink-0 accent-accent"
                          checked={selected.has(n.id)}
                          disabled={busy}
                          onChange={() => setSelected((s) => toggleId(s, n.id))}
                          aria-labelledby={labelId}
                        />
                        <div className="min-w-0 flex-1">
                          <p id={labelId} className="text-sm text-text-primary break-words">
                            {n.preview || '(empty note)'}
                          </p>
                          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-tertiary">
                            <span>{n.type}</span>
                            <span aria-hidden="true">·</span>
                            <span className="break-all">{n.source}</span>
                            <span aria-hidden="true">·</span>
                            <span>{formatNoteDate(n.ingestion_time)}</span>
                            <span
                              className={`rounded-md border px-2 py-0.5 text-2xs font-medium ${
                                n.is_public ? 'border-success text-success' : 'border-border-primary text-text-secondary'
                              }`}
                            >
                              {n.is_public ? 'Public' : 'Private'}
                            </span>
                          </p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </M3Card>
        </M3Page>
      </div>
    </AppShell>
  );
}
