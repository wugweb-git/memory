/**
 * Public surface of the connector framework.
 */

import { CONNECTORS, getConnector } from './registry';
import { getConnectorState, isDue } from './state';
import type { Connector, ConnectorStatus, SyncResult } from './types';

export { CONNECTORS, getConnector };
export type { Connector, ConnectorStatus, SyncResult };

/** Registry + live state, serialized for the API / UI. */
export async function listConnectorStatuses(): Promise<ConnectorStatus[]> {
  return Promise.all(
    CONNECTORS.map(async (c): Promise<ConnectorStatus> => {
      const state = await getConnectorState(c.id);
      return {
        id: c.id,
        label: c.label,
        category: c.category,
        kind: c.kind,
        requires: c.requires,
        cadenceMins: c.cadenceMins,
        setupHint: c.setupHint,
        configured: c.configured(),
        lastSyncAt: state.lastSyncAt,
        lastError: state.lastError,
        lastResult: state.lastResult,
      };
    }),
  );
}

/** Run one connector by id. Returns null if unknown. */
export async function syncConnector(
  id: string,
  opts?: { autoPromote?: boolean },
): Promise<SyncResult | null> {
  const connector = getConnector(id);
  if (!connector) return null;
  return connector.sync(opts);
}

/** Connectors the scheduler may auto-run: real (rss/api), configured, and due. */
export async function dueConnectors(now = Date.now()): Promise<Connector[]> {
  const out: Connector[] = [];
  for (const c of CONNECTORS) {
    if (c.kind !== 'rss' && c.kind !== 'api') continue;
    if (!c.configured()) continue;
    const state = await getConnectorState(c.id);
    if (isDue(state, c.cadenceMins, now)) out.push(c);
  }
  return out;
}
