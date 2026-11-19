/**
 * Google Calendar (multi-calendar, windowed events) and Google Tasks connectors
 * on the existing Google OAuth. Honest states:
 *   - no GOOGLE_CLIENT_ID/SECRET  -> configured() false, sync => NOT_CONFIGURED
 *   - consent not done            -> connected() false, sync => NOT_CONFIGURED
 *   - Tasks scope not granted     -> NOT_CONFIGURED: reconnect Google
 */

import { googleApiGet, googleClientConfigured, googleConnected } from '@/lib/oauth/google';
import type { Connector, SyncResult } from '@/lib/ingestion/connectors/types';
import { ingestItems, recordError, type PendingItem } from './sync-items';

const AUTH_PATH = '/api/oauth/google/start?returnTo=/integrations';
const CAL = 'https://www.googleapis.com/calendar/v3';
const TASKS = 'https://tasks.googleapis.com/tasks/v1';

type Deps = {
  api?: <T = any>(url: string) => Promise<T>;
  now?: () => number;
  configured?: () => boolean;
  connected?: () => Promise<boolean>;
};

async function gate(deps: Deps): Promise<string | null> {
  if (!(deps.configured ?? googleClientConfigured)()) {
    return 'NOT_CONFIGURED: set GOOGLE_CLIENT_ID/SECRET';
  }
  if (!(await (deps.connected ?? googleConnected)().catch(() => false))) {
    return 'NOT_CONFIGURED: connect Google first';
  }
  return null;
}

export function mapEvent(calendarId: string, e: any): PendingItem | null {
  if (!e?.id || e.status === 'cancelled') return null;
  return {
    sourceId: `gcalev:${calendarId}:${e.id}:${e.updated ?? ''}`,
    type: 'google_calendar_event',
    payload: {
      title: e.summary ?? '(no title)',
      text: [e.summary, e.description, e.location].filter(Boolean).join('\n'),
      calendar: calendarId,
      location: e.location ?? null,
      start: e.start?.dateTime ?? e.start?.date ?? null,
      end: e.end?.dateTime ?? e.end?.date ?? null,
      attendees: Array.isArray(e.attendees) ? e.attendees.length : 0,
      url: e.htmlLink ?? null,
    },
  };
}

export function mapTask(listTitle: string, listId: string, t: any): PendingItem | null {
  if (!t?.id || !t.title?.trim()) return null;
  return {
    sourceId: `gtask:${listId}:${t.id}:${t.updated ?? ''}`,
    type: 'google_task',
    payload: {
      title: t.title,
      text: [t.title, t.notes].filter(Boolean).join('\n'),
      list: listTitle,
      status: t.status ?? null,
      due: t.due ?? null,
      completed: t.completed ?? null,
      url: t.webViewLink ?? null,
    },
  };
}

export function makeCalendarEventsConnector(deps: Deps = {}): Connector {
  return {
    id: 'google-calendar-events',
    label: 'Google Calendar events',
    category: 'knowledge',
    kind: 'oauth',
    requires: 'oauth',
    cadenceMins: 360,
    setupHint: 'Set GOOGLE_CLIENT_ID/SECRET, then Connect Google. Syncs events (past 30 / next 60 days) from all your calendars.',
    authStartPath: AUTH_PATH,
    configured: deps.configured ?? googleClientConfigured,
    connected: deps.connected ?? googleConnected,
    async sync(): Promise<SyncResult> {
      const blocked = await gate(deps);
      if (blocked) return { ingested: 0, skipped: 0, error: blocked };
      const api = deps.api ?? googleApiGet;
      const now = (deps.now ?? Date.now)();
      const timeMin = new Date(now - 30 * 86_400_000).toISOString();
      const timeMax = new Date(now + 60 * 86_400_000).toISOString();
      try {
        const list = await api<{ items?: any[] }>(`${CAL}/users/me/calendarList?maxResults=10&minAccessRole=reader`);
        const calendars = (list.items ?? []).filter((c) => c?.id && !c.deleted).slice(0, 10);
        const items: PendingItem[] = [];
        for (const c of calendars) {
          const url =
            `${CAL}/calendars/${encodeURIComponent(c.id)}/events?maxResults=50&singleEvents=true` +
            `&orderBy=startTime&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`;
          const data = await api<{ items?: any[] }>(url);
          for (const e of data.items ?? []) {
            const m = mapEvent(c.id, e);
            if (m) items.push(m);
          }
        }
        return await ingestItems({ connectorId: 'google-calendar-events', source: 'google_calendar_events', items, max: 100 });
      } catch (err: any) {
        return recordError('google-calendar-events', err?.message ?? String(err));
      }
    },
  };
}

export function makeTasksConnector(deps: Deps = {}): Connector {
  return {
    id: 'google-tasks',
    label: 'Google Tasks',
    category: 'knowledge',
    kind: 'oauth',
    requires: 'oauth',
    cadenceMins: 360,
    setupHint: 'Set GOOGLE_CLIENT_ID/SECRET, then Connect (or reconnect) Google to grant read-only Tasks access.',
    authStartPath: AUTH_PATH,
    configured: deps.configured ?? googleClientConfigured,
    connected: deps.connected ?? googleConnected,
    async sync(): Promise<SyncResult> {
      const blocked = await gate(deps);
      if (blocked) return { ingested: 0, skipped: 0, error: blocked };
      const api = deps.api ?? googleApiGet;
      try {
        const lists = await api<{ items?: any[] }>(`${TASKS}/users/@me/lists?maxResults=20`);
        const items: PendingItem[] = [];
        for (const l of (lists.items ?? []).slice(0, 20)) {
          const data = await api<{ items?: any[] }>(
            `${TASKS}/lists/${encodeURIComponent(l.id)}/tasks?maxResults=100&showCompleted=true&showHidden=false`,
          );
          for (const t of data.items ?? []) {
            const m = mapTask(l.title ?? 'Tasks', l.id, t);
            if (m) items.push(m);
          }
        }
        return await ingestItems({ connectorId: 'google-tasks', source: 'google_tasks', items, max: 100 });
      } catch (err: any) {
        const msg: string = err?.message ?? String(err);
        // Missing scope / API disabled surfaces as a 403 — report it as a setup gap, not a crash.
        if (/insufficient|scope|permission|has not been used|disabled|forbidden|403/i.test(msg)) {
          return recordError('google-tasks', `NOT_CONFIGURED: Google Tasks access not granted (reconnect Google; enable Tasks API). ${msg}`);
        }
        return recordError('google-tasks', msg);
      }
    },
  };
}

export const googleCalendarEventsConnector = makeCalendarEventsConnector();
export const googleTasksConnector = makeTasksConnector();
