/**
 * iCloud Calendar over CalDAV (fetch only). Apple has no calendar API, but
 * iCloud speaks CalDAV to an Apple ID plus an app-specific password.
 *
 * Credentials: ICLOUD_APPLE_ID and ICLOUD_APP_PASSWORD, read through
 * getCredential (a value saved in the app wins over the env var). configured()
 * is synchronous and reads the primed credential cache (getCredentialSync), so
 * credentials saved in the app count too; tests inject deps.env instead.
 * Credentials are never logged and never placed in an error message.
 *
 * Flow: PROPFIND current-user-principal, then calendar-home-set, then the
 * calendars under it, then REPORT calendar-query for events from 30 days ago to
 * 60 days ahead. Source tag: icloud_calendar.
 */

import type { Connector, SyncResult } from '@/lib/ingestion/connectors/types';
import { getCredential, getCredentialSync } from '@/lib/publishing/credentials';
import { ingestItems, recordError, type PendingItem } from './sync-items';

export const ICLOUD_BASE = 'https://caldav.icloud.com/';
const PAST_DAYS = 30;
const FUTURE_DAYS = 60;
const MAX_EVENTS = 200;

export const ICLOUD_AUTH_HELP =
  'iCloud rejected the sign-in. Create an app-specific password at account.apple.com (Sign-In and Security, then App-Specific Passwords) and use it instead of your Apple ID password.';

type Deps = {
  fetchFn?: typeof fetch;
  getCred?: (key: string) => Promise<string | undefined>;
  now?: () => Date;
  env?: NodeJS.ProcessEnv;
  /** Test seams for the buffer and error recording. */
  ingest?: typeof ingestItems;
  fail?: typeof recordError;
};

class AuthError extends Error {}

// ── ICS parsing ──────────────────────────────────────────────────────────

export interface IcsEvent {
  uid: string;
  summary: string;
  start: string | null;
  end: string | null;
  allDay: boolean;
  tzid: string | null;
  location: string | null;
  description: string | null;
  recurrenceId: string | null;
  recurring: boolean;
  cancelled: boolean;
}

const unescapeIcs = (v: string) => v.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1');

/** 20240304 -> 2024-03-04; 20240304T090000Z -> 2024-03-04T09:00:00Z; floating/TZID stay local. */
function icsDate(v: string): { iso: string; allDay: boolean } | null {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z?))?$/.exec(v.trim());
  if (!m) return null;
  if (m[4] === undefined) return { iso: `${m[1]}-${m[2]}-${m[3]}`, allDay: true };
  return { iso: `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}${m[7]}`, allDay: false };
}

export function parseIcs(ics: string): IcsEvent[] {
  const lines = ics.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n[ \t]/g, '').split('\n');
  const events: IcsEvent[] = [];
  let cur: IcsEvent | null = null;
  let depth = 0; // nested components (VALARM) inside a VEVENT
  for (const line of lines) {
    if (!line) continue;
    if (/^BEGIN:VEVENT$/i.test(line)) {
      cur = { uid: '', summary: '', start: null, end: null, allDay: false, tzid: null, location: null, description: null, recurrenceId: null, recurring: false, cancelled: false };
      depth = 0;
      continue;
    }
    if (!cur) continue;
    if (/^END:VEVENT$/i.test(line)) {
      events.push(cur);
      cur = null;
      continue;
    }
    if (/^BEGIN:/i.test(line)) { depth++; continue; }
    if (/^END:/i.test(line)) { depth--; continue; }
    if (depth > 0) continue;
    const colon = line.indexOf(':');
    if (colon < 0) continue;
    const [name, ...params] = line.slice(0, colon).split(';');
    const value = line.slice(colon + 1);
    switch (name.toUpperCase()) {
      case 'UID': cur.uid = value.trim(); break;
      case 'SUMMARY': cur.summary = unescapeIcs(value).trim(); break;
      case 'LOCATION': cur.location = unescapeIcs(value).trim() || null; break;
      case 'DESCRIPTION': cur.description = unescapeIcs(value).trim() || null; break;
      case 'STATUS': cur.cancelled = /^CANCELLED$/i.test(value.trim()); break;
      case 'RRULE': cur.recurring = true; break;
      case 'RECURRENCE-ID': cur.recurrenceId = value.trim(); break;
      case 'DTSTART': {
        const d = icsDate(value);
        if (d) { cur.start = d.iso; cur.allDay = d.allDay || params.some((p) => /^VALUE=DATE$/i.test(p)); }
        const tz = params.find((p) => /^TZID=/i.test(p));
        if (tz) cur.tzid = tz.slice(5);
        break;
      }
      case 'DTEND': { const d = icsDate(value); if (d) cur.end = d.iso; break; }
    }
  }
  return events;
}

// ── XML helpers (CalDAV responses are small; regex is enough) ────────────

const decodeXml = (s: string) =>
  s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#13;/g, '\r').replace(/&amp;/g, '&');

function firstHref(xml: string, parent: string): string | null {
  const m = new RegExp(`<(?:\\w+:)?${parent}[^>]*>\\s*<(?:\\w+:)?href[^>]*>([^<]+)<`, 'i').exec(xml);
  return m ? decodeXml(m[1]).trim() : null;
}

function responses(xml: string): string[] {
  return xml.split(/<(?:\w+:)?response[\s>]/i).slice(1);
}

export interface CalendarRef { href: string; name: string }

export function parseCalendars(xml: string, base: string): CalendarRef[] {
  const out: CalendarRef[] = [];
  for (const r of responses(xml)) {
    const href = /<(?:\w+:)?href[^>]*>([^<]+)</i.exec(r)?.[1];
    if (!href) continue;
    const rt = /<(?:\w+:)?resourcetype[^>]*>([\s\S]*?)<\/(?:\w+:)?resourcetype>/i.exec(r)?.[1] ?? '';
    if (!/<(?:\w+:)?calendar\s*\/?>/i.test(rt)) continue; // skips inbox, outbox, notifications, the home itself
    const comps = /<(?:\w+:)?supported-calendar-component-set[^>]*>([\s\S]*?)<\/(?:\w+:)?supported-calendar-component-set>/i.exec(r)?.[1];
    if (comps && !/VEVENT/i.test(comps)) continue; // reminders lists
    const name = decodeXml(/<(?:\w+:)?displayname[^>]*>([^<]*)</i.exec(r)?.[1] ?? '').trim() || 'Calendar';
    out.push({ href: new URL(decodeXml(href).trim(), base).toString(), name });
  }
  return out;
}

const icsStamp = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

// ── CalDAV client ────────────────────────────────────────────────────────

async function dav(f: typeof fetch, url: string, method: string, depth: string, body: string, auth: string): Promise<string> {
  // Credentials only ever go to iCloud over https, even if a server response names another host.
  const target = new URL(url);
  if (target.protocol !== 'https:' || !(target.hostname === 'icloud.com' || target.hostname.endsWith('.icloud.com'))) {
    throw new Error('iCloud CalDAV returned an unexpected address.');
  }
  const res = await f(url, {
    method,
    headers: { Authorization: auth, Depth: depth, 'Content-Type': 'application/xml; charset=utf-8' },
    body,
    signal: AbortSignal.timeout(20_000),
  });
  if (res.status === 401 || res.status === 403) throw new AuthError(ICLOUD_AUTH_HELP);
  if (res.status !== 207 && !res.ok) throw new Error(`iCloud CalDAV ${method} failed (HTTP ${res.status}).`);
  return await res.text();
}

const NS = 'xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav"';

export async function fetchIcloudEvents(opts: { appleId: string; appPassword: string; fetchFn?: typeof fetch; now?: Date }): Promise<{ calendar: string; event: IcsEvent }[]> {
  const f = opts.fetchFn ?? fetch;
  const auth = `Basic ${Buffer.from(`${opts.appleId}:${opts.appPassword}`).toString('base64')}`;
  const now = opts.now ?? new Date();

  const root = await dav(f, ICLOUD_BASE, 'PROPFIND', '0', `<?xml version="1.0"?><d:propfind ${NS}><d:prop><d:current-user-principal/></d:prop></d:propfind>`, auth);
  const principalHref = firstHref(root, 'current-user-principal');
  if (!principalHref) throw new Error('iCloud did not return a principal for this account.');
  const principalUrl = new URL(principalHref, ICLOUD_BASE).toString();

  const home = await dav(f, principalUrl, 'PROPFIND', '0', `<?xml version="1.0"?><d:propfind ${NS}><d:prop><c:calendar-home-set/></d:prop></d:propfind>`, auth);
  const homeHref = firstHref(home, 'calendar-home-set');
  if (!homeHref) throw new Error('iCloud did not return a calendar home for this account.');
  const homeUrl = new URL(homeHref, principalUrl).toString();

  const list = await dav(f, homeUrl, 'PROPFIND', '1', `<?xml version="1.0"?><d:propfind ${NS}><d:prop><d:resourcetype/><d:displayname/><c:supported-calendar-component-set/></d:prop></d:propfind>`, auth);
  const calendars = parseCalendars(list, homeUrl);

  const start = new Date(now.getTime() - PAST_DAYS * 86_400_000);
  const end = new Date(now.getTime() + FUTURE_DAYS * 86_400_000);
  // Ask the server to expand recurring events into instances for the same window, so a weekly
  // meeting shows up as the occurrences inside it rather than one master with an old start date.
  const range = `start="${icsStamp(start)}" end="${icsStamp(end)}"`;
  const query = `<?xml version="1.0"?><c:calendar-query ${NS}><d:prop><c:calendar-data><c:expand ${range}/></c:calendar-data></d:prop><c:filter><c:comp-filter name="VCALENDAR"><c:comp-filter name="VEVENT"><c:time-range ${range}/></c:comp-filter></c:comp-filter></c:filter></c:calendar-query>`;

  const out: { calendar: string; event: IcsEvent }[] = [];
  for (const cal of calendars) {
    const xml = await dav(f, cal.href, 'REPORT', '1', query, auth);
    for (const m of xml.matchAll(/<(?:\w+:)?calendar-data[^>]*>([\s\S]*?)<\/(?:\w+:)?calendar-data>/gi)) {
      for (const event of parseIcs(decodeXml(m[1]))) out.push({ calendar: cal.name, event });
    }
  }
  return out;
}

export function mapIcloudEvent(calendar: string, e: IcsEvent): PendingItem | null {
  if (e.cancelled || !e.uid || !e.start) return null;
  const title = e.summary || '(no title)';
  return {
    sourceId: `icloud:${calendar}:${e.uid}:${e.recurrenceId ?? e.start}`,
    type: 'icloud_calendar_event',
    payload: {
      title,
      text: [title, e.description, e.location].filter(Boolean).join('\n'),
      calendar,
      location: e.location,
      start: e.start,
      end: e.end,
      all_day: e.allDay,
      timezone: e.tzid,
      recurring: e.recurring,
    },
  };
}

export function makeIcloudConnector(deps: Deps = {}): Connector {
  const cred = (k: string) => (deps.getCred ?? getCredential)(k);
  return {
    id: 'icloud-calendar',
    label: 'iCloud Calendar',
    category: 'knowledge',
    kind: 'api',
    requires: 'env',
    cadenceMins: 360,
    setupHint: 'Create an app-specific password at account.apple.com (Sign-In and Security), then set ICLOUD_APPLE_ID and ICLOUD_APP_PASSWORD.',
    configured: () => {
      // Injected env (tests) wins; otherwise saved value first, env var second (same as Spotify).
      const get = (k: string) => (deps.env ? deps.env[k] : getCredentialSync(k));
      return Boolean(get('ICLOUD_APPLE_ID') && get('ICLOUD_APP_PASSWORD'));
    },
    async sync(opts): Promise<SyncResult> {
      const [appleId, appPassword] = await Promise.all([cred('ICLOUD_APPLE_ID'), cred('ICLOUD_APP_PASSWORD')]);
      if (!appleId || !appPassword) return { ingested: 0, skipped: 0, error: 'NOT_CONFIGURED: set ICLOUD_APPLE_ID and ICLOUD_APP_PASSWORD (an app-specific password)' };
      try {
        const events = await fetchIcloudEvents({ appleId, appPassword, fetchFn: deps.fetchFn, now: deps.now?.() });
        const items = events.map((x) => mapIcloudEvent(x.calendar, x.event)).filter(Boolean) as PendingItem[];
        return await (deps.ingest ?? ingestItems)({ connectorId: 'icloud-calendar', source: 'icloud_calendar', items, max: MAX_EVENTS, autoPromote: opts?.autoPromote });
      } catch (err: any) {
        // Only our own fixed messages reach the error; never the raw error, which could echo a header.
        const msg = err instanceof AuthError ? err.message : /^iCloud /.test(err?.message ?? '') ? err.message : 'iCloud Calendar sync failed.';
        return (deps.fail ?? recordError)('icloud-calendar', msg);
      }
    },
  };
}

export const icloudCalendarConnector = makeIcloudConnector();
