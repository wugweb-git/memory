/**
 * Shared dedup-and-buffer helper for the connectors in this folder. Same
 * contract as the Google connectors: dedupe against per-connector `seen` state
 * (Neon scheduler_state) and hold items review-first in the blob buffer.
 */

import { Push_To_Blob, Promote_To_Memory } from '@/lib/blobLayer';
import { getConnectorState, saveConnectorState } from '@/lib/ingestion/connectors/state';
import type { SyncResult } from '@/lib/ingestion/connectors/types';

export interface PendingItem {
  sourceId: string;
  type: string;
  payload: Record<string, unknown>;
}

export async function ingestItems(opts: {
  connectorId: string;
  source: string;
  items: PendingItem[];
  /** 'synced' for API pulls, 'upload' for user-supplied files. */
  inputMode?: 'synced' | 'upload';
  max?: number;
  /** Promote each new item into memory after buffering (owner's auto-promote setting). */
  autoPromote?: boolean;
  /** Test seams. */
  deps?: {
    push?: typeof Push_To_Blob;
    promote?: (id: string) => Promise<unknown>;
    getState?: typeof getConnectorState;
    saveState?: typeof saveConnectorState;
  };
}): Promise<SyncResult> {
  const { connectorId, source } = opts;
  const push = opts.deps?.push ?? Push_To_Blob;
  const promote = opts.deps?.promote ?? Promote_To_Memory;
  const getState = opts.deps?.getState ?? getConnectorState;
  const saveState = opts.deps?.saveState ?? saveConnectorState;
  const state = await getState(connectorId);
  const items = opts.items.slice(0, opts.max ?? 25);
  const seen = new Set(state.seen);
  const newlySeen: string[] = [];
  let ingested = 0;
  let skipped = 0;

  for (const it of items) {
    if (seen.has(it.sourceId)) {
      skipped++;
      continue;
    }
    const blob = await push({
      type: it.type,
      source,
      source_id: it.sourceId,
      raw_payload: it.payload,
      trace_json: {
        origin: source,
        input_mode: opts.inputMode ?? 'synced',
        declared_author: 'self',
        ingestion_path: `connector/${connectorId}`,
        received_at: new Date().toISOString(),
      },
    });
    if (opts.autoPromote && blob?.id) {
      // Best-effort: a promotion failure must never lose the buffered item.
      try {
        await promote(blob.id);
      } catch {
        /* stays review-first in the buffer */
      }
    }
    seen.add(it.sourceId);
    newlySeen.push(it.sourceId);
    ingested++;
  }

  await saveState(connectorId, {
    lastSyncAt: new Date().toISOString(),
    lastError: null,
    lastResult: { ingested, skipped, scanned: items.length },
    seen: [...state.seen, ...newlySeen],
  });
  return { ingested, skipped, scanned: items.length };
}

export async function recordError(connectorId: string, error: string): Promise<SyncResult> {
  const state = await getConnectorState(connectorId);
  await saveConnectorState(connectorId, { ...state, lastSyncAt: new Date().toISOString(), lastError: error });
  return { ingested: 0, skipped: 0, error };
}
