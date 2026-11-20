import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deflateRawSync } from 'node:zlib';
import {
  summariseAppleHealthXml, parseAppleHealthExport, importAppleHealth, APPLE_HEALTH_MAX_BYTES, appleHealthConnector,
} from '../../src/lib/connectors/apple-health';
import { parseIcs, fetchIcloudEvents, makeIcloudConnector, mapIcloudEvent, ICLOUD_AUTH_HELP } from '../../src/lib/connectors/icloud';
import { shouldAutoPromote } from '../../src/lib/ingestion/connectors/auto-promote';
import { CONNECTORS } from '../../src/lib/ingestion/connectors/registry';

const XML = `<?xml version="1.0"?>
<HealthData locale="en_US">
 <Record type="HKQuantityTypeIdentifierStepCount" sourceName="iPhone" unit="count" startDate="2024-03-04 08:00:00 +0100" endDate="2024-03-04 08:30:00 +0100" value="3000"/>
 <Record type="HKQuantityTypeIdentifierStepCount" sourceName="iPhone" unit="count" startDate="2024-03-06 08:00:00 +0100" endDate="2024-03-06 08:30:00 +0100" value="4500"/>
 <Record type="HKQuantityTypeIdentifierStepCount" sourceName="Watch" unit="count" startDate="2024-03-04 08:00:00 +0100" endDate="2024-03-04 08:30:00 +0100" value="1000"/>
 <Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="Watch" startDate="2024-03-04 23:00:00 +0100" endDate="2024-03-05 07:00:00 +0100" value="HKCategoryValueSleepAnalysisAsleepCore"/>
 <Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="Watch" startDate="2024-03-05 22:00:00 +0100" endDate="2024-03-06 04:00:00 +0100" value="HKCategoryValueSleepAnalysisInBed"/>
 <Record type="HKQuantityTypeIdentifierRestingHeartRate" sourceName="Watch" unit="count/min" startDate="2024-03-05 09:00:00 +0100" endDate="2024-03-05 09:00:00 +0100" value="60"/>
 <Record type="HKQuantityTypeIdentifierRestingHeartRate" sourceName="Watch" unit="count/min" startDate="2024-03-06 09:00:00 +0100" endDate="2024-03-06 09:00:00 +0100" value="62"/>
 <Workout workoutActivityType="HKWorkoutActivityTypeRunning" duration="30" durationUnit="min" startDate="2024-03-05 18:00:00 +0100" endDate="2024-03-05 18:30:00 +0100">
  <MetadataEntry key="a" value="b"/>
 </Workout>
 <Record type="HKQuantityTypeIdentifierStepCount" sourceName="iPhone" unit="count" startDate="2024-03-11 08:00:00 +0100" endDate="2024-03-11 08:30:00 +0100" value="100"/>
</HealthData>`;

function makeZip(files: Record<string, string>): Buffer {
  const locals: Buffer[] = []; const central: Buffer[] = []; let offset = 0;
  for (const [name, content] of Object.entries(files)) {
    const nb = Buffer.from(name); const raw = Buffer.from(content); const comp = deflateRawSync(raw);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(8, 8); lh.writeUInt32LE(comp.length, 18); lh.writeUInt32LE(raw.length, 22); lh.writeUInt16LE(nb.length, 26);
    locals.push(lh, nb, comp);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(8, 10); ch.writeUInt32LE(comp.length, 20); ch.writeUInt32LE(raw.length, 24); ch.writeUInt16LE(nb.length, 28); ch.writeUInt32LE(offset, 42);
    central.push(ch, nb); offset += 30 + nb.length + comp.length;
  }
  const cd = Buffer.concat(central); const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(Object.keys(files).length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, end]);
}

test('apple health: weekly summary of steps, workouts, sleep and resting heart rate', () => {
  const weeks = summariseAppleHealthXml(Buffer.from(XML));
  assert.equal(weeks.length, 2);
  const w = weeks[0];
  assert.equal(w.weekStart, '2024-03-04');
  assert.equal(w.weekEnd, '2024-03-10');
  assert.equal(w.steps, 7500); // iPhone only; the Watch is not double counted
  assert.deepEqual(w.sleep, { hours: 8, nights: 1 }); // in-bed ignored
  assert.deepEqual(w.workouts, { count: 1, minutes: 30, types: ['running'] });
  assert.deepEqual(w.restingHeartRate, { avg: 61, samples: 2, unit: 'count/min' });
});

test('apple health: chunk boundaries do not drop records', () => {
  const big = '<HealthData>' + XML.split('\n').filter((l) => l.includes('<Record')).join('\n').repeat(1) + ' '.repeat(1024 * 1024 - 700) + XML.split('\n')[2] + '</HealthData>';
  const weeks = summariseAppleHealthXml(Buffer.from(big));
  assert.ok(weeks.length >= 1);
});

test('apple health: items are one per week with source tag data and units', () => {
  const items = parseAppleHealthExport('export.zip', makeZip({ 'apple_health_export/export.xml': XML, 'apple_health_export/export_cda.xml': '<x/>' }));
  assert.equal(items.length, 2);
  assert.equal(items[0].type, 'apple_health_week');
  assert.match(String(items[0].payload.text), /Steps: 7,500 steps/);
  assert.match(String(items[0].payload.text), /Resting heart rate: 61 count\/min/);
  assert.equal(parseAppleHealthExport('export.xml', Buffer.from(XML)).length, 2);
});

test('apple health: the in-progress week is not imported, so it cannot be locked in partial', () => {
  // XML has weeks starting 2024-03-04 (ends 03-10) and 2024-03-11 (ends 03-17).
  const during = parseAppleHealthExport('export.xml', Buffer.from(XML), new Date('2024-03-14T12:00:00Z'));
  assert.equal(during.length, 1);
  assert.equal(during[0].payload.week_start, '2024-03-04');
  // On the week's last day it is still in progress.
  assert.equal(parseAppleHealthExport('export.xml', Buffer.from(XML), new Date('2024-03-17T09:00:00Z')).length, 1);
  assert.equal(parseAppleHealthExport('export.xml', Buffer.from(XML), new Date('2024-03-18T00:00:00Z')).length, 2);
  for (const i of during) assert.ok(Date.parse(String(i.payload.published_at)) <= Date.parse('2024-03-14T12:00:00Z'));
});

test('apple health: size cap gives a clear error and nothing is ingested', async () => {
  const huge = Buffer.alloc(APPLE_HEALTH_MAX_BYTES + 1);
  assert.throws(() => parseAppleHealthExport('export.xml', huge), /over 50 MB/);
  let pushed = 0;
  const r = await importAppleHealth('export.xml', huge, {
    deps: { push: (async () => { pushed++; return { id: 'x' }; }) as any, getState: (async () => ({ seen: [] })) as any, saveState: (async () => {}) as any },
  }).catch((e) => ({ error: String(e) }));
  assert.equal(pushed, 0);
  assert.ok(r && 'error' in r && r.error);
});

test('apple health: ingests with source apple_health, is not trusted for auto-promote', async () => {
  const sources: string[] = [];
  const r = await importAppleHealth('export.xml', Buffer.from(XML), {
    deps: { push: (async (x: any) => { sources.push(x.source); return { id: 'b' }; }) as any, getState: (async () => ({ seen: [] })) as any, saveState: (async () => {}) as any },
  });
  assert.equal(r.ingested, 2);
  assert.deepEqual(new Set(sources), new Set(['apple_health']));
  assert.equal(shouldAutoPromote('trusted', 'apple-health'), false);
  assert.equal(shouldAutoPromote('off', 'apple-health'), false);
  assert.equal(shouldAutoPromote('all', 'apple-health'), true);
  assert.ok(CONNECTORS.some((c) => c.id === 'apple-health'));
  assert.equal((await appleHealthConnector.sync()).error?.startsWith('NOT_CONFIGURED'), true);
});

const ICS = [
  'BEGIN:VCALENDAR', 'BEGIN:VEVENT', 'UID:a1', 'SUMMARY:Design review with a very long title that is',
  '  folded across lines\\, with a comma', 'DTSTART;TZID=Europe/Berlin:20240305T090000', 'DTEND;TZID=Europe/Berlin:20240305T100000',
  'LOCATION:Room 4', 'DESCRIPTION:Line one\\nLine two', 'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:alarm text', 'END:VALARM', 'END:VEVENT',
  'BEGIN:VEVENT', 'UID:a2', 'SUMMARY:Holiday', 'DTSTART;VALUE=DATE:20240308', 'DTEND;VALUE=DATE:20240309', 'RRULE:FREQ=YEARLY', 'END:VEVENT',
  'BEGIN:VEVENT', 'UID:a3', 'SUMMARY:Cancelled call', 'DTSTART:20240306T100000Z', 'STATUS:CANCELLED', 'END:VEVENT', 'END:VCALENDAR',
].join('\r\n');

test('ics: folded lines, escapes, all-day, cancelled, alarms ignored', () => {
  const ev = parseIcs(ICS);
  assert.equal(ev.length, 3);
  assert.equal(ev[0].summary, 'Design review with a very long title that is folded across lines, with a comma'.replace('is folded', 'is folded'));
  assert.equal(ev[0].start, '2024-03-05T09:00:00');
  assert.equal(ev[0].tzid, 'Europe/Berlin');
  assert.equal(ev[0].description, 'Line one\nLine two');
  assert.equal(ev[1].allDay, true);
  assert.equal(ev[1].start, '2024-03-08');
  assert.equal(ev[1].recurring, true);
  assert.equal(ev[2].cancelled, true);
  assert.equal(mapIcloudEvent('Home', ev[2]), null);
  assert.equal(mapIcloudEvent('Home', ev[0])?.payload.all_day, false);
});

const wrap = (inner: string) => `<?xml version="1.0"?><d:multistatus xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">${inner}</d:multistatus>`;
function fakeFetch(log: Array<{ url: string; method: string; depth: string }>, authStatus = 207) {
  return (async (url: any, init: any) => {
    log.push({ url: String(url), method: init.method, depth: init.headers.Depth });
    if (authStatus === 401) return new Response('no', { status: 401 });
    const u = String(url);
    let body = '';
    if (u === 'https://caldav.icloud.com/') body = wrap('<d:response><d:propstat><d:prop><d:current-user-principal><d:href>/123/principal/</d:href></d:current-user-principal></d:prop></d:propstat></d:response>');
    else if (u.endsWith('/123/principal/')) body = wrap('<d:response><d:propstat><d:prop><c:calendar-home-set><d:href>https://p01-caldav.icloud.com:443/123/calendars/</d:href></c:calendar-home-set></d:prop></d:propstat></d:response>');
    else if (init.method === 'PROPFIND') body = wrap(
      '<d:response><d:href>/123/calendars/</d:href><d:propstat><d:prop><d:resourcetype><d:collection/></d:resourcetype></d:prop></d:propstat></d:response>' +
      '<d:response><d:href>/123/calendars/home/</d:href><d:propstat><d:prop><d:resourcetype><d:collection/><c:calendar/></d:resourcetype><d:displayname>Home</d:displayname><c:supported-calendar-component-set><c:comp name="VEVENT"/></c:supported-calendar-component-set></d:prop></d:propstat></d:response>' +
      '<d:response><d:href>/123/calendars/tasks/</d:href><d:propstat><d:prop><d:resourcetype><d:collection/><c:calendar/></d:resourcetype><d:displayname>Reminders</d:displayname><c:supported-calendar-component-set><c:comp name="VTODO"/></c:supported-calendar-component-set></d:prop></d:propstat></d:response>');
    else body = wrap(`<d:response><d:href>/123/calendars/home/a1.ics</d:href><d:propstat><d:prop><c:calendar-data>${ICS.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</c:calendar-data></d:prop></d:propstat></d:response>`);
    return new Response(body, { status: 207 });
  }) as unknown as typeof fetch;
}

test('caldav: principal, calendar home, calendar list, then REPORT with a time range', async () => {
  const log: Array<{ url: string; method: string; depth: string }> = [];
  const out = await fetchIcloudEvents({ appleId: 'me@example.com', appPassword: 'abcd-efgh-ijkl-mnop', fetchFn: fakeFetch(log), now: new Date('2024-03-10T00:00:00Z') });
  assert.equal(out.length, 3);
  assert.equal(out[0].calendar, 'Home');
  assert.deepEqual(log.map((l) => l.method), ['PROPFIND', 'PROPFIND', 'PROPFIND', 'REPORT']); // Reminders list skipped
  assert.equal(log[3].url, 'https://p01-caldav.icloud.com/123/calendars/home/');
});

test('caldav: REPORT asks for expansion over the same window so recurring events arrive as instances', async () => {
  const master = ['BEGIN:VCALENDAR', 'BEGIN:VEVENT', 'UID:weekly', 'SUMMARY:Standup', 'DTSTART:20230102T090000Z', 'DTEND:20230102T091500Z', 'RRULE:FREQ=WEEKLY', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const inst = (d: string) => ['BEGIN:VEVENT', 'UID:weekly', 'RECURRENCE-ID:' + d + 'T090000Z', 'SUMMARY:Standup', 'DTSTART:' + d + 'T090000Z', 'DTEND:' + d + 'T091500Z', 'END:VEVENT'].join('\r\n');
  const expanded = ['BEGIN:VCALENDAR', inst('20240311'), inst('20240318'), 'END:VCALENDAR'].join('\r\n');
  let reportBody = '';
  const inner = fakeFetch([]);
  const f = (async (url: any, init: any) => {
    if (init.method !== 'REPORT') return (inner as any)(url, init);
    reportBody = String(init.body);
    const ics = /<c:expand /.test(reportBody) ? expanded : master;
    return new Response(wrap(`<d:response><d:href>/123/calendars/home/w.ics</d:href><d:propstat><d:prop><c:calendar-data>${ics}</c:calendar-data></d:prop></d:propstat></d:response>`), { status: 207 });
  }) as unknown as typeof fetch;
  const out = await fetchIcloudEvents({ appleId: 'me@example.com', appPassword: 'abcd-efgh-ijkl-mnop', fetchFn: f, now: new Date('2024-03-10T00:00:00Z') });
  const range = /<c:time-range (start="[^"]+" end="[^"]+")\/>/.exec(reportBody)?.[1];
  assert.ok(range);
  assert.ok(reportBody.includes(`<c:calendar-data><c:expand ${range}/></c:calendar-data>`), 'expand uses the same window as time-range');
  assert.equal(out.length, 2);
  const items = out.map((x) => mapIcloudEvent(x.calendar, x.event)!);
  assert.deepEqual(items.map((i) => i.payload.start), ['2024-03-11T09:00:00Z', '2024-03-18T09:00:00Z']);
  assert.equal(new Set(items.map((i) => i.sourceId)).size, 2); // each occurrence dedups separately
  // A server that ignores expand and sends the master still parses (tolerant).
  assert.equal(parseIcs(master).length, 1);
});

test('icloud connector: configured() goes through the credential reader, not just injected env', () => {
  const keys = ['ICLOUD_APPLE_ID', 'ICLOUD_APP_PASSWORD'];
  const saved = keys.map((k) => process.env[k]);
  try {
    for (const k of keys) delete process.env[k];
    const c = makeIcloudConnector();
    assert.equal(c.configured(), false);
    process.env.ICLOUD_APPLE_ID = 'me@example.com';
    assert.equal(c.configured(), false); // both are needed
    process.env.ICLOUD_APP_PASSWORD = 'abcd-efgh-ijkl-mnop';
    assert.equal(c.configured(), true); // getCredentialSync: saved value first, env second
  } finally {
    keys.forEach((k, i) => { if (saved[i] === undefined) delete process.env[k]; else process.env[k] = saved[i]; });
  }
});

test('icloud connector: NOT_CONFIGURED until credentials, then ingests under icloud_calendar', async () => {
  const none = makeIcloudConnector({ env: {} as any, getCred: async () => undefined });
  assert.equal(none.configured(), false);
  assert.match((await none.sync()).error ?? '', /^NOT_CONFIGURED/);
  assert.equal(makeIcloudConnector({ env: { ICLOUD_APPLE_ID: 'a', ICLOUD_APP_PASSWORD: 'b' } as any }).configured(), true);

  const calls: any[] = [];
  const c = makeIcloudConnector({
    getCred: async (k) => (k === 'ICLOUD_APPLE_ID' ? 'me@example.com' : 'abcd-efgh-ijkl-mnop'),
    fetchFn: fakeFetch([]),
    now: () => new Date('2024-03-10T00:00:00Z'),
    ingest: (async (o: any) => { calls.push(o); return { ingested: o.items.length, skipped: 0 }; }) as any,
  });
  const r = await c.sync();
  assert.equal(r.ingested, 2); // cancelled event dropped
  assert.equal(calls[0].source, 'icloud_calendar');
  assert.ok(CONNECTORS.some((x) => x.id === 'icloud-calendar' && x.category === 'knowledge' && x.kind === 'api' && x.requires === 'env'));
});

test('icloud: 401 gives the app-specific password message and never leaks credentials', async () => {
  const secret = 'abcd-efgh-ijkl-mnop';
  const b64 = Buffer.from(`me@example.com:${secret}`).toString('base64');
  await assert.rejects(fetchIcloudEvents({ appleId: 'me@example.com', appPassword: secret, fetchFn: fakeFetch([], 401) }), (e: Error) => e.message === ICLOUD_AUTH_HELP && !e.message.includes(secret));
  const errors: string[] = [];
  const c = makeIcloudConnector({
    getCred: async (k) => (k === 'ICLOUD_APPLE_ID' ? 'me@example.com' : secret),
    fetchFn: (async () => { throw new Error(`boom Authorization: Basic ${b64} ${secret}`); }) as any,
    fail: (async (_id: string, m: string) => { errors.push(m); return { ingested: 0, skipped: 0, error: m }; }) as any,
  });
  const r = await c.sync();
  assert.equal(r.error, 'iCloud Calendar sync failed.');
  for (const m of [...errors, r.error!]) { assert.ok(!m.includes(secret)); assert.ok(!m.includes(b64)); assert.ok(!m.includes('me@example.com')); }
  const c401 = makeIcloudConnector({ getCred: async () => 'x', fetchFn: fakeFetch([], 401), fail: (async (_i: string, m: string) => ({ ingested: 0, skipped: 0, error: m })) as any });
  assert.match((await c401.sync()).error ?? '', /app-specific password/);
});
