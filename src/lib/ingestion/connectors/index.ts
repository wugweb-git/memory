/**
 * Public surface of the connector framework.
 */

import { CONNECTORS, customFeedConnectors, getConnector } from './registry';
import { CONFIGURABLE, getConfigValue, primeConnectorConfig } from './config';
import { getConnectorState, isDue } from './state';
import type { Connector, ConnectorStatus, SyncResult } from './types';

export { CONNECTORS, getConnector };
export type { Connector, ConnectorStatus, SyncResult };

/** Built-in connectors plus feeds the owner added. Loads saved setup first. */
export async function allConnectors(): Promise<Connector[]> {
  await primeConnectorConfig();
  return [...CONNECTORS, ...customFeedConnectors()];
}

/** Look up one connector by id, including owner-added feeds. */
export async function resolveConnector(id: string): Promise<Connector | undefined> {
  return (await allConnectors()).find((c) => c.id === id);
}

/** Registry + live state, serialized for the API / UI. */
export async function listConnectorStatuses(): Promise<ConnectorStatus[]> {
  const all = await allConnectors();
  return Promise.all(
    all.map(async (c): Promise<ConnectorStatus> => {
      const state = await getConnectorState(c.id);
      // OAuth connectors report an extra "connected" level (consent completed).
      const connected = c.connected ? await c.connected().catch(() => false) : undefined;
      return {
        id: c.id,
        label: c.label,
        category: c.category,
        kind: c.kind,
        requires: c.requires,
        cadenceMins: c.cadenceMins,
        setupHint: c.setupHint,
        configured: c.configured(),
        connected,
        authStartPath: c.authStartPath,
        setup: CONFIGURABLE[c.id],
        setupValue: CONFIGURABLE[c.id] ? getConfigValue(c.id) : undefined,
        custom: c.custom,
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
  const connector = await resolveConnector(id);
  if (!connector) return null;
  return connector.sync(opts);
}

/** Connectors the scheduler may auto-run: rss/api, or a connected OAuth source. */
export async function dueConnectors(now = Date.now()): Promise<Connector[]> {
  const out: Connector[] = [];
  for (const c of await allConnectors()) {
    const autoKind = c.kind === 'rss' || c.kind === 'api' || c.kind === 'oauth';
    if (!autoKind) continue;
    if (!c.configured()) continue;
    // OAuth sources must have completed consent before the scheduler runs them.
    if (c.connected && !(await c.connected().catch(() => false))) continue;
    const state = await getConnectorState(c.id);
    if (isDue(state, c.cadenceMins, now)) out.push(c);
  }
  return out;
}
