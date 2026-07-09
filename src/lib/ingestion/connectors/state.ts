/**
 * Per-connector sync state, persisted in the Neon `scheduler_state` table
 * (key `connector:<id>`). Tracks the last sync time (for cadence) and a rolling
 * list of recently-seen source ids (for cross-run dedup). No schema migration
 * needed — reuses the existing SchedulerState model.
 */

import { postgres } from '@/lib/db/postgres';

const SEEN_CAP = 300;

export interface ConnectorState {
  lastSyncAt: string | null;
  lastError: string | null;
  lastResult: { ingested: number; skipped: number; scanned?: number } | null;
  /** Rolling window of recently ingested source ids (URLs / page ids). */
  seen: string[];
}

const EMPTY: ConnectorState = {
  lastSyncAt: null,
  lastError: null,
  lastResult: null,
  seen: [],
};

const stateKey = (id: string) => `connector:${id}`;

export async function getConnectorState(id: string): Promise<ConnectorState> {
  try {
    const row = await postgres.schedulerState.findUnique({ where: { key: stateKey(id) } });
    if (!row?.value) return { ...EMPTY };
    const v = row.value as Partial<ConnectorState>;
    return {
      lastSyncAt: v.lastSyncAt ?? null,
      lastError: v.lastError ?? null,
      lastResult: v.lastResult ?? null,
      seen: Array.isArray(v.seen) ? v.seen : [],
    };
  } catch {
    // Fail open — a missing/unavailable state table should not block a sync.
    return { ...EMPTY };
  }
}

export async function saveConnectorState(id: string, state: ConnectorState): Promise<void> {
  const value = {
    ...state,
    seen: state.seen.slice(-SEEN_CAP),
  };
  await postgres.schedulerState.upsert({
    where: { key: stateKey(id) },
    create: { key: stateKey(id), value: value as any },
    update: { value: value as any },
  });
}

/** True if this connector's cadence has elapsed since its last successful sync. */
export function isDue(state: ConnectorState, cadenceMins: number, now = Date.now()): boolean {
  if (!state.lastSyncAt) return true;
  const last = Date.parse(state.lastSyncAt);
  if (Number.isNaN(last)) return true;
  return now - last >= cadenceMins * 60_000;
}
