import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deflateRawSync } from 'node:zlib';
import { mapEvent, mapTask, makeCalendarEventsConnector, makeTasksConnector } from '../../src/lib/connectors/google-extra';
import { parseXTweets, parseXExport, parseLinkedInExport, linkedinConnector, twitterConnector } from '../../src/lib/connectors/exports';
import { sttConfig, transcribeAudio, ingestAudioFile, voiceConnector } from '../../src/lib/connectors/voice';
import { readZip } from '../../src/lib/connectors/zip';
import { CONNECTORS } from '../../src/lib/ingestion/connectors/registry';

function makeZip(files: Record<string, string>): Buffer {
  const locals: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const [name, content] of Object.entries(files)) {
    const nb = Buffer.from(name);
    const raw = Buffer.from(content);
    const comp = deflateRawSync(raw);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(8, 8);
    lh.writeUInt32LE(comp.length, 18); lh.writeUInt32LE(raw.length, 22); lh.writeUInt16LE(nb.length, 26);
    locals.push(lh, nb, comp);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(8, 10);
    ch.writeUInt32LE(comp.length, 20); ch.writeUInt32LE(raw.length, 24); ch.writeUInt16LE(nb.length, 28);
    ch.writeUInt32LE(offset, 42);
    central.push(ch, nb);
    offset += 30 + nb.length + comp.length;
  }
  const cd = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, end]);
}

test('zip reader round-trips deflated entries', () => {
  const z = readZip(makeZip({ 'a/b.txt': 'hello', 'c.txt': 'world' }));
  assert.equal(z.get('a/b.txt')?.toString(), 'hello');
  assert.equal(z.get('c.txt')?.toString(), 'world');
  assert.throws(() => readZip(Buffer.from('nope nope nope nope nope nope')));
});

test('google mappers skip cancelled events / empty tasks', () => {
  assert.equal(mapEvent('primary', { id: '1', status: 'cancelled' }), null);
  assert.equal(mapEvent('primary', { id: '1', summary: 'Standup', updated: 'u' })?.sourceId, 'gcalev:primary:1:u');
  assert.equal(mapTask('L', 'l1', { id: 't', title: '  ' }), null);
  assert.equal(mapTask('L', 'l1', { id: 't', title: 'Do', updated: 'u' })?.type, 'google_task');
});

test('google connectors return NOT_CONFIGURED without env / consent', async () => {
  const noEnv = { configured: () => false, connected: async () => false };
  for (const c of [makeCalendarEventsConnector(noEnv), makeTasksConnector(noEnv)]) {
    const r = await c.sync();
    assert.match(r.error ?? '', /^NOT_CONFIGURED/);
    assert.equal(r.ingested, 0);
  }
  const noConsent = { configured: () => true, connected: async () => false, api: async () => { throw new Error('should not call'); } };
  const r = await makeTasksConnector(noConsent as any).sync();
  assert.match(r.error ?? '', /connect Google/);
});

test('X tweets.js archive parsing', () => {
  const js = 'window.YTD.tweets.part0 = [{"tweet":{"id_str":"9","full_text":"RT @a hi","created_at":"x","favorite_count":"3"}},{"tweet":{"id_str":"10","full_text":""}}]';
  const items = parseXTweets(js);
  assert.equal(items.length, 1);
  assert.equal(items[0].sourceId, 'x:tweet:9');
  assert.equal(items[0].payload.is_retweet, true);
  assert.throws(() => parseXTweets('window.x = [oops'));
  const zipped = parseXExport('archive.zip', makeZip({ 'data/tweets.js': js, 'data/like.js': 'window.YTD.like.part0 = []' }));
  assert.equal(zipped.length, 1);
});

test('LinkedIn export: shares + positions, never connections', () => {
  const zip = makeZip({
    'Shares.csv': 'Date,ShareLink,ShareCommentary\n2024-01-01,https://li/p/1,"Hello, world"\n',
    'Positions.csv': 'Company Name,Title,Description,Location,Started On\nAcme,Eng,Built stuff,,Jan 2020\n',
    'Connections.csv': 'First Name,Last Name\nA,B\n',
  });
  const items = parseLinkedInExport('export.zip', Buffer.from(zip));
  assert.deepEqual(items.map((i) => i.type).sort(), ['linkedin_position', 'linkedin_post']);
  assert.equal(items.find((i) => i.type === 'linkedin_post')?.payload.text, 'Hello, world');
});

test('STT config precedence and honest NOT_CONFIGURED', async () => {
  assert.equal(sttConfig({}), null);
  assert.equal(sttConfig({ OPENAI_API_KEY: 'o', GROQ_API_KEY: 'g' } as any)?.provider, 'groq');
  assert.equal(sttConfig({ STT_API_URL: 'u', STT_API_KEY: 'k', GROQ_API_KEY: 'g' } as any)?.provider, 'custom');
  const saved = { ...process.env };
  delete process.env.GROQ_API_KEY; delete process.env.OPENAI_API_KEY; delete process.env.STT_API_URL;
  try {
    const r = await ingestAudioFile(Buffer.from('x'), 'a.mp3', 'audio/mpeg', { env: {} });
    assert.match(r.error ?? '', /^NOT_CONFIGURED/);
    assert.equal(voiceConnector.configured(), false);
    assert.match((await voiceConnector.sync()).error ?? '', /^NOT_CONFIGURED/);
  } finally { Object.assign(process.env, saved); }
});

test('transcribeAudio uses provider response and rejects empty/failed', async () => {
  const env = { GROQ_API_KEY: 'g' } as any;
  const ok = (async () => new Response(JSON.stringify({ text: ' hi there ' }), { status: 200 })) as typeof fetch;
  assert.equal((await transcribeAudio(Buffer.from('a'), 'a.mp3', 'audio/mpeg', { env, fetchImpl: ok })).text, 'hi there');
  const empty = (async () => new Response(JSON.stringify({ text: '' }), { status: 200 })) as typeof fetch;
  await assert.rejects(transcribeAudio(Buffer.from('a'), 'a.mp3', 'audio/mpeg', { env, fetchImpl: empty }), /no speech/);
  const bad = (async () => new Response(JSON.stringify({ error: { message: 'nope' } }), { status: 401 })) as typeof fetch;
  await assert.rejects(transcribeAudio(Buffer.from('a'), 'a.mp3', 'audio/mpeg', { env, fetchImpl: bad }), /401/);
});

test('export connectors are honest about API sync', async () => {
  for (const c of [linkedinConnector, twitterConnector]) {
    assert.equal(c.kind, 'manual');
    assert.match((await c.sync()).error ?? '', /^NOT_CONFIGURED/);
  }
});

test('registry lists the new connectors', () => {
  const ids = CONNECTORS.map((c) => c.id);
  for (const id of ['google-calendar-events', 'google-tasks', 'voice', 'linkedin', 'twitter', 'behance', 'dribbble']) {
    assert.ok(ids.includes(id), id);
  }
  assert.equal(new Set(ids).size, ids.length);
});
