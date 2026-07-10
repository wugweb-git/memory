/**
 * Google connectors (Drive metadata + Calendar) over the read-only OAuth flow
 * in `lib/oauth/google`. Both dedupe against per-connector `seen` state and
 * hold items review-first in the buffer.
 *
 * Readiness has two levels:
 *   - configured(): GOOGLE_CLIENT_ID/SECRET present (sync, env)
 *   - connected():  owner completed consent + we hold a token (async)
 */

import { Push_To_Blob } from '@/lib/blobLayer';
import { googleApiGet, googleClientConfigured, googleConnected } from '@/lib/oauth/google';
import { getConnectorState, saveConnectorState } from './state';
import type { Connector, SyncResult } from './types';

const MAX_ITEMS = 25;
const AUTH_PATH = '/api/oauth/google/start?returnTo=/integrations';

async function syncItems(
  connectorId: string,
  source: string,
  fetchItems: () => Promise<Array<{ sourceId: string; type: string; payload: Record<string, unknown> }>>,
): Promise<SyncResult> {
  const state = await getConnectorState(connectorId);

  let items;
  try {
    items = (await fetchItems()).slice(0, MAX_ITEMS);
  } catch (err: any) {
    const error = err?.message ?? String(err);
    await saveConnectorState(connectorId, { ...state, lastSyncAt: new Date().toISOString(), lastError: error });
    return { ingested: 0, skipped: 0, error };
  }

  const seen = new Set(state.seen);
  const newlySeen: string[] = [];
  let ingested = 0;
  let skipped = 0;

  for (const it of items) {
    if (seen.has(it.sourceId)) {
      skipped++;
      continue;
    }
    await Push_To_Blob({
      type: it.type,
      source,
      source_id: it.sourceId,
      raw_payload: it.payload,
      trace_json: {
        origin: source,
        input_mode: 'synced',
        declared_author: 'self',
        ingestion_path: `connector/${connectorId}`,
        received_at: new Date().toISOString(),
      },
    });
    seen.add(it.sourceId);
    newlySeen.push(it.sourceId);
    ingested++;
  }

  await saveConnectorState(connectorId, {
    lastSyncAt: new Date().toISOString(),
    lastError: null,
    lastResult: { ingested, skipped, scanned: items.length },
    seen: [...state.seen, ...newlySeen],
  });
  return { ingested, skipped, scanned: items.length };
}

export const googleDriveConnector: Connector = {
  id: 'google-drive',
  label: 'Google Drive',
  category: 'files',
  kind: 'oauth',
  requires: 'oauth',
  cadenceMins: 360,
  setupHint: 'Set GOOGLE_CLIENT_ID/SECRET, then Connect to grant read-only Drive access.',
  authStartPath: AUTH_PATH,
  configured: googleClientConfigured,
  connected: googleConnected,
  async sync() {
    return syncItems('google-drive', 'google_drive', async () => {
      const fields = 'files(id,name,mimeType,modifiedTime,webViewLink,owners(displayName))';
      const url =
        'https://www.googleapis.com/drive/v3/files?orderBy=modifiedTime desc&pageSize=25' +
        `&fields=${encodeURIComponent(fields)}`;
      const data = await googleApiGet<{ files?: any[] }>(url);
      return (data.files ?? []).map((f) => ({
        sourceId: `drive:${f.id}:${f.modifiedTime ?? ''}`,
        type: 'google_drive_file',
        payload: {
          name: f.name ?? null,
          mimeType: f.mimeType ?? null,
          url: f.webViewLink ?? null,
          modifiedTime: f.modifiedTime ?? null,
          owner: f.owners?.[0]?.displayName ?? null,
        },
      }));
    });
  },
};

export const googleCalendarConnector: Connector = {
  id: 'google-calendar',
  label: 'Google Calendar',
  category: 'knowledge',
  kind: 'oauth',
  requires: 'oauth',
  cadenceMins: 360,
  setupHint: 'Set GOOGLE_CLIENT_ID/SECRET, then Connect to grant read-only Calendar access.',
  authStartPath: AUTH_PATH,
  configured: googleClientConfigured,
  connected: googleConnected,
  async sync() {
    return syncItems('google-calendar', 'google_calendar', async () => {
      const url =
        'https://www.googleapis.com/calendar/v3/calendars/primary/events' +
        '?maxResults=25&singleEvents=true&orderBy=updated';
      const data = await googleApiGet<{ items?: any[] }>(url);
      return (data.items ?? []).map((e) => ({
        sourceId: `gcal:${e.id}:${e.updated ?? ''}`,
        type: 'google_calendar_event',
        payload: {
          summary: e.summary ?? null,
          description: e.description ?? null,
          location: e.location ?? null,
          start: e.start?.dateTime ?? e.start?.date ?? null,
          end: e.end?.dateTime ?? e.end?.date ?? null,
          htmlLink: e.htmlLink ?? null,
        },
      }));
    });
  },
};
