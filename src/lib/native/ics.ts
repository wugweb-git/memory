/**
 * RFC 5545 iCalendar generation + a small tolerant parser for imports.
 * Pure. Output uses CRLF line endings, UTC times, escaped text and 75-octet folding.
 * A web app cannot write to the Android calendar provider directly; the .ics file
 * (opened by the Calendar app) or a Google Calendar template link is the supported path.
 */

export interface IcsEvent {
  title: string;
  start: Date;
  /** Defaults to start + 60 minutes (or +1 day for all-day). */
  end?: Date;
  allDay?: boolean;
  description?: string;
  location?: string;
  url?: string;
  /** Stable UID; derived from title+start when omitted so re-importing updates instead of duplicating. */
  uid?: string;
  /** Minutes before start for a display alarm. Omit for none. */
  alarmMinutes?: number;
}

export const PRODID = '-//Identity Prism OS//Native bridge//EN';
const UID_DOMAIN = 'prism-os';
const DEFAULT_DURATION_MS = 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const pad = (n: number, w = 2) => String(n).padStart(w, '0');

/** 20260315T093000Z */
export function formatUtc(d: Date): string {
  return `${pad(d.getUTCFullYear(), 4)}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

/** 20260315 (UTC calendar date, used for all-day events). */
export function formatDate(d: Date): string {
  return `${pad(d.getUTCFullYear(), 4)}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

/** TEXT escaping per RFC 5545 3.3.11. */
export function escapeIcsText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r\n|\r|\n/g, '\\n');
}

export function unescapeIcsText(s: string): string {
  return s.replace(/\\([nN,;\\])/g, (_m, c: string) => (c === 'n' || c === 'N' ? '\n' : c));
}

/** Fold a content line at 75 octets (UTF-8), never splitting a code point. Continuation lines start with one space. */
export function foldLine(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const out: string[] = [];
  let cur = '';
  let curBytes = 0;
  let limit = 75;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (curBytes + b > limit) {
      out.push(cur);
      cur = '';
      curBytes = 0;
      limit = 74; // the leading space counts as one octet
    }
    cur += ch;
    curBytes += b;
  }
  if (cur) out.push(cur);
  return out.join('\r\n ');
}

/** FNV-1a, enough to make a stable UID from text. */
function hash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export function makeUid(seed: string): string {
  return `${hash(seed)}${hash(seed.split('').reverse().join(''))}@${UID_DOMAIN}`;
}

function assertDate(d: unknown, label: string): asserts d is Date {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) throw new RangeError(`${label} must be a valid Date`);
}

export function resolveEnd(ev: Pick<IcsEvent, 'start' | 'end' | 'allDay'>): Date {
  const min = ev.allDay ? DAY_MS : DEFAULT_DURATION_MS;
  if (ev.end && !Number.isNaN(ev.end.getTime()) && ev.end.getTime() > ev.start.getTime()) return ev.end;
  return new Date(ev.start.getTime() + min);
}

export function buildIcs(ev: IcsEvent, now: Date = new Date()): string {
  assertDate(ev.start, 'start');
  const title = ev.title.trim() || 'Event';
  const end = resolveEnd(ev);
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${PRODID}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${ev.uid ?? makeUid(`${title}|${ev.start.toISOString()}`)}`,
    `DTSTAMP:${formatUtc(now)}`,
  ];
  if (ev.allDay) {
    lines.push(`DTSTART;VALUE=DATE:${formatDate(ev.start)}`, `DTEND;VALUE=DATE:${formatDate(end)}`);
  } else {
    lines.push(`DTSTART:${formatUtc(ev.start)}`, `DTEND:${formatUtc(end)}`);
  }
  lines.push(`SUMMARY:${escapeIcsText(title)}`);
  if (ev.description?.trim()) lines.push(`DESCRIPTION:${escapeIcsText(ev.description.trim())}`);
  if (ev.location?.trim()) lines.push(`LOCATION:${escapeIcsText(ev.location.trim())}`);
  if (ev.url?.trim()) lines.push(`URL:${ev.url.trim()}`);
  if (typeof ev.alarmMinutes === 'number' && Number.isFinite(ev.alarmMinutes) && ev.alarmMinutes >= 0) {
    lines.push(
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeIcsText(title)}`,
      `TRIGGER:-PT${Math.floor(ev.alarmMinutes)}M`,
      'END:VALARM',
    );
  }
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}

export function icsFileName(title: string): string {
  const slug = title
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 48);
  return `${slug || 'event'}.ics`;
}

/** Opens Google Calendar's "create event" form; works from any browser, including Android Chrome. */
export function googleCalendarUrl(ev: IcsEvent): string {
  assertDate(ev.start, 'start');
  const end = resolveEnd(ev);
  const dates = ev.allDay
    ? `${formatDate(ev.start)}/${formatDate(end)}`
    : `${formatUtc(ev.start)}/${formatUtc(end)}`;
  const q = new URLSearchParams({ action: 'TEMPLATE', text: ev.title.trim() || 'Event', dates });
  const details = [ev.description?.trim(), ev.url?.trim()].filter(Boolean).join('\n\n');
  if (details) q.set('details', details);
  if (ev.location?.trim()) q.set('location', ev.location.trim());
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

/* ---------------- Import (best effort) ---------------- */

export interface ParsedIcsEvent {
  title: string;
  start: Date | null;
  end: Date | null;
  allDay: boolean;
  description: string;
  location: string;
  uid: string;
}

export function unfoldIcs(text: string): string[] {
  return text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '').split(/\r\n|\n|\r/);
}

function parseIcsDate(value: string, params: string): { date: Date | null; allDay: boolean } {
  const v = value.trim();
  if (/VALUE=DATE(?!-)/i.test(params) || /^\d{8}$/.test(v)) {
    const m = /^(\d{4})(\d{2})(\d{2})$/.exec(v);
    return m ? { date: new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])), allDay: true } : { date: null, allDay: true };
  }
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/.exec(v);
  if (!m) return { date: null, allDay: false };
  const [y, mo, d, h, mi, s] = [+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]];
  // Floating / TZID times are interpreted in the local zone; "Z" is UTC.
  return { date: m[7] ? new Date(Date.UTC(y, mo, d, h, mi, s)) : new Date(y, mo, d, h, mi, s), allDay: false };
}

export function parseIcs(text: string): ParsedIcsEvent[] {
  const events: ParsedIcsEvent[] = [];
  let cur: ParsedIcsEvent | null = null;
  let alarmDepth = 0;
  for (const line of unfoldIcs(text)) {
    if (/^BEGIN:VEVENT$/i.test(line)) {
      cur = { title: '', start: null, end: null, allDay: false, description: '', location: '', uid: '' };
      alarmDepth = 0;
      continue;
    }
    if (/^END:VEVENT$/i.test(line)) {
      if (cur) events.push(cur);
      cur = null;
      continue;
    }
    if (!cur) continue;
    if (/^BEGIN:VALARM$/i.test(line)) alarmDepth++;
    if (/^END:VALARM$/i.test(line)) alarmDepth--;
    if (alarmDepth > 0) continue;
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    const [name, ...paramParts] = line.slice(0, idx).split(';');
    const params = paramParts.join(';');
    const value = line.slice(idx + 1);
    switch (name.toUpperCase()) {
      case 'SUMMARY': cur.title = unescapeIcsText(value); break;
      case 'DESCRIPTION': cur.description = unescapeIcsText(value); break;
      case 'LOCATION': cur.location = unescapeIcsText(value); break;
      case 'UID': cur.uid = value.trim(); break;
      case 'DTSTART': { const r = parseIcsDate(value, params); cur.start = r.date; cur.allDay = r.allDay; break; }
      case 'DTEND': cur.end = parseIcsDate(value, params).date; break;
      default: break;
    }
  }
  return events;
}
