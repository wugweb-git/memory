/**
 * Notion connector — wraps the existing token-based `ingestNotion` and adds
 * cross-run dedup + status tracking via connector state.
 */

import { ingestNotion } from '../notion';
import { getConnectorState, saveConnectorState } from './state';
import type { Connector, SyncResult } from './types';

const ID = 'notion';

async function sync(opts: { autoPromote?: boolean } = {}): Promise<SyncResult> {
  const state = await getConnectorState(ID);
  try {
    const res = await ingestNotion({ autoPromote: opts.autoPromote, skipSeen: state.seen });
    const newlySeen = res.items.filter((i) => i.blob_id).map((i) => i.source_id);
    const ingested = res.items.filter((i) => i.blob_id).length;
    const skipped = res.items.filter((i) => !i.blob_id).length;

    await saveConnectorState(ID, {
      lastSyncAt: new Date().toISOString(),
      lastError: null,
      lastResult: { ingested, skipped, scanned: res.scanned },
      seen: [...state.seen, ...newlySeen],
    });
    return { ingested, skipped, scanned: res.scanned };
  } catch (err: any) {
    const error = err?.message ?? String(err);
    await saveConnectorState(ID, { ...state, lastSyncAt: new Date().toISOString(), lastError: error });
    return { ingested: 0, skipped: 0, error };
  }
}

export const notionConnector: Connector = {
  id: ID,
  label: 'Notion',
  category: 'knowledge',
  kind: 'api',
  requires: 'env',
  cadenceMins: 180,
  setupHint: 'Create an internal integration at notion.so/my-integrations, share pages with it, set NOTION_TOKEN.',
  configured: () => Boolean(process.env.NOTION_TOKEN),
  sync,
};
