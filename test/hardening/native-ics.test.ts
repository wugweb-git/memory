import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildIcs, escapeIcsText, foldLine, formatUtc, googleCalendarUrl, icsFileName, makeUid, parseIcs, resolveEnd,
} from '../../src/lib/native/ics';

const start = new Date(Date.UTC(2026, 2, 15, 9, 30, 0));
const now = new Date(Date.UTC(2026, 0, 1, 0, 0, 0));

test('formatUtc is RFC 5545 basic UTC', () => {
  assert.equal(formatUtc(start), '20260315T093000Z');
});

test('escapeIcsText escapes backslash, semicolon, comma and newlines', () => {
  assert.equal(escapeIcsText('a\\b;c,d\ne\r\nf'), 'a\\\\b\\;c\\,d\\ne\\nf');
});

test('foldLine keeps lines at 75 octets and unfolds back to the original', () => {
  const long = 'DESCRIPTION:' + 'x'.repeat(200);
  const folded = foldLine(long);
  const lines = folded.split('\r\n');
  assert.ok(lines.length > 1);
  for (const l of lines) assert.ok(new TextEncoder().encode(l).length <= 75);
  assert.equal(folded.replace(/\r\n /g, ''), long);
});

test('foldLine never splits a multibyte code point', () => {
  const line = 'SUMMARY:' + '\u{1F600}'.repeat(40) + 'é'.repeat(40);
  const folded = foldLine(line);
  for (const l of folded.split('\r\n')) assert.ok(new TextEncoder().encode(l).length <= 75);
  assert.equal(folded.replace(/\r\n /g, ''), line);
});

test('buildIcs emits a valid CRLF VEVENT with UTC times, UID and alarm', () => {
  const ics = buildIcs({ title: 'Plan, review; ship', start, end: new Date(start.getTime() + 30 * 60000), location: 'Room 4', description: 'Line 1\nLine 2', alarmMinutes: 15 }, now);
  assert.ok(ics.endsWith('\r\n'));
  assert.ok(!/[^\r]\n/.test(ics), 'only CRLF line endings');
  const lines = ics.split('\r\n');
  assert.equal(lines[0], 'BEGIN:VCALENDAR');
  assert.ok(lines.includes('VERSION:2.0'));
  assert.ok(lines.includes('DTSTART:20260315T093000Z'));
  assert.ok(lines.includes('DTEND:20260315T100000Z'));
  assert.ok(lines.includes('DTSTAMP:20260101T000000Z'));
  assert.ok(lines.includes('SUMMARY:Plan\\, review\\; ship'));
  assert.ok(lines.includes('DESCRIPTION:Line 1\\nLine 2'));
  assert.ok(lines.some((l) => /^UID:[0-9a-f]+@prism-os$/.test(l)));
  assert.ok(lines.includes('TRIGGER:-PT15M'));
  assert.ok(lines.includes('BEGIN:VALARM') && lines.includes('END:VALARM'));
  assert.equal(lines.filter((l) => l === 'BEGIN:VEVENT').length, 1);
  assert.equal(lines.filter((l) => l === 'END:VEVENT').length, 1);
});

test('UID is stable for the same event and differs otherwise', () => {
  assert.equal(makeUid('a'), makeUid('a'));
  assert.notEqual(makeUid('a'), makeUid('b'));
});

test('default end is +60 minutes (or +1 day all-day); inverted end is corrected', () => {
  assert.equal(resolveEnd({ start }).getTime(), start.getTime() + 3600000);
  assert.equal(resolveEnd({ start, allDay: true }).getTime(), start.getTime() + 86400000);
  assert.equal(resolveEnd({ start, end: new Date(start.getTime() - 1000) }).getTime(), start.getTime() + 3600000);
});

test('all-day events use VALUE=DATE', () => {
  const ics = buildIcs({ title: 'Holiday', start: new Date(Date.UTC(2026, 11, 25)), allDay: true }, now);
  assert.ok(ics.includes('DTSTART;VALUE=DATE:20261225'));
  assert.ok(ics.includes('DTEND;VALUE=DATE:20261226'));
});

test('invalid start throws', () => {
  assert.throws(() => buildIcs({ title: 'x', start: new Date('nope') }), RangeError);
});

test('long summaries are folded in the output', () => {
  const ics = buildIcs({ title: 'T'.repeat(300), start }, now);
  for (const l of ics.split('\r\n')) assert.ok(new TextEncoder().encode(l).length <= 75);
});

test('round trip through parseIcs', () => {
  const ics = buildIcs({ title: 'Plan, review', start, location: 'HQ; floor 2', description: 'a\nb', alarmMinutes: 10 }, now);
  const [ev] = parseIcs(ics);
  assert.equal(ev.title, 'Plan, review');
  assert.equal(ev.location, 'HQ; floor 2');
  assert.equal(ev.description, 'a\nb');
  assert.equal(ev.start?.toISOString(), start.toISOString());
  assert.equal(ev.allDay, false);
});

test('parseIcs reads all-day events and ignores VALARM descriptions', () => {
  const txt = 'BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nUID:1\r\nDTSTART;VALUE=DATE:20260101\r\nSUMMARY:New year\r\nBEGIN:VALARM\r\nDESCRIPTION:alarm text\r\nEND:VALARM\r\nEND:VEVENT\r\nEND:VCALENDAR';
  const [ev] = parseIcs(txt);
  assert.equal(ev.allDay, true);
  assert.equal(ev.description, '');
  assert.equal(ev.start?.toISOString(), '2026-01-01T00:00:00.000Z');
});

test('googleCalendarUrl and icsFileName', () => {
  const u = new URL(googleCalendarUrl({ title: 'Lunch & learn', start, location: 'Cafe' }));
  assert.equal(u.origin + u.pathname, 'https://calendar.google.com/calendar/render');
  assert.equal(u.searchParams.get('action'), 'TEMPLATE');
  assert.equal(u.searchParams.get('text'), 'Lunch & learn');
  assert.equal(u.searchParams.get('dates'), '20260315T093000Z/20260315T103000Z');
  assert.equal(u.searchParams.get('location'), 'Cafe');
  assert.equal(icsFileName('Weekly Sync: Q4!'), 'weekly-sync-q4.ics');
  assert.equal(icsFileName('???'), 'event.ics');
});
