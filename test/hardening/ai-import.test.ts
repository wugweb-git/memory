import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deflateRawSync } from 'node:zlib';
import { parseChatGpt } from '../../src/lib/ingestion/ai-imports/chatgpt';
import { parseClaude } from '../../src/lib/ingestion/ai-imports/claude';
import { parseGemini } from '../../src/lib/ingestion/ai-imports/gemini';
import { parseMemoryList, parseTranscript } from '../../src/lib/ingestion/ai-imports/generic';
import { detectJsonSource, parseAiExport } from '../../src/lib/ingestion/ai-imports/parse';
import { windowConversation, WINDOW_TARGET } from '../../src/lib/ingestion/ai-imports/window';
import { conversationToPackets, sanitizeConversations } from '../../src/lib/ingestion/ai-imports/packets';
import { processChunk, type ImportDb } from '../../src/lib/ingestion/ai-imports/commit';
import { readZipTexts, ZIP_MATCHERS } from '../../src/lib/ingestion/ai-imports/zip-browser';
import type { NormalizedConversation } from '../../src/lib/ingestion/ai-imports/types';

/* ------------------------------ fixtures ------------------------------ */

const node = (id: string, parent: string | null, children: string[], message: any) => ({ id, parent, children, message });

const CHATGPT = [
  {
    id: 'conv-1',
    conversation_id: 'conv-1',
    title: 'Planning a Lisbon trip',
    create_time: 1700000000.5,
    update_time: 1700000900,
    current_node: 'n5b',
    mapping: {
      root: node('root', null, ['n1'], null),
      n1: node('n1', 'root', ['n2'], { author: { role: 'system' }, create_time: 1700000000, content: { content_type: 'text', parts: [''] }, metadata: { is_visually_hidden_from_conversation: true } }),
      n2: node('n2', 'n1', ['n3'], { author: { role: 'user' }, create_time: 1700000010, content: { content_type: 'text', parts: ['Where should I stay in Lisbon?'] } }),
      n3: node('n3', 'n2', ['n4a', 'n4b'], { author: { role: 'assistant' }, create_time: 1700000020, content: { content_type: 'text', parts: ['Alfama is lovely.'] } }),
      // an abandoned branch (regenerated answer) that must NOT be imported
      n4a: node('n4a', 'n3', [], { author: { role: 'user' }, create_time: 1700000030, content: { content_type: 'text', parts: ['OLD BRANCH question'] } }),
      n4b: node('n4b', 'n3', ['n5a'], { author: { role: 'user' }, create_time: 1700000040, content: { content_type: 'multimodal_text', parts: [{ content_type: 'image_asset_pointer', asset_pointer: 'file-service://x' }, 'What about this photo of a flat?'] } }),
      n5a: node('n5a', 'n4b', ['n5b'], { author: { role: 'tool' }, create_time: 1700000045, content: { content_type: 'text', parts: ['tool output'] } }),
      n5b: node('n5b', 'n5a', [], { author: { role: 'assistant' }, create_time: 1700000050, content: { content_type: 'text', parts: ['Looks cosy, check the lease.'] } }),
    },
  },
  { id: 'conv-2', title: null, mapping: { a: node('a', null, [], { author: { role: 'user' }, create_time: null, content: { content_type: 'text', parts: ['A conversation with no current_node or time'] } }) } },
  { id: 'conv-3', title: 'Empty', mapping: {} },
  'garbage',
];

const CLAUDE = [
  {
    uuid: 'c-uuid-1',
    name: 'Refactoring a parser',
    created_at: '2024-05-01T10:00:00.000000Z',
    updated_at: '2024-05-01T10:05:00.000000Z',
    chat_messages: [
      { uuid: 'm1', sender: 'human', text: 'How do I split this function?', content: [{ type: 'text', text: 'How do I split this function?' }], created_at: '2024-05-01T10:00:01Z', attachments: [{ file_name: 'a.py' }], files: [{ file_name: 'img.png' }] },
      { uuid: 'm2', sender: 'assistant', text: '', content: [{ type: 'text', text: 'Extract the tokenizer first.' }, { type: 'tool_use', name: 'x' }], created_at: '2024-05-01T10:00:09Z', attachments: [], files: [] },
      { uuid: 'm3', sender: 'system', text: 'internal', created_at: '2024-05-01T10:00:10Z' },
      { uuid: 'm4', sender: 'human', text: '   ', created_at: 'not a date' },
    ],
    unknown_future_field: { a: 1 },
  },
  { uuid: 'c-uuid-2', name: '', chat_messages: [] },
];

const GEMINI = [
  { header: 'Gemini Apps', title: 'Prompted Summarise my meeting notes', time: '2025-02-03T09:15:00.000Z', products: ['Gemini Apps'], safeHtmlItem: [{ html: '<p>Here is a <b>summary</b>:</p><ul><li>Ship it</li><li>Fix tests</li></ul>' }] },
  { header: 'Gemini Apps', title: 'Prompted Earlier question', time: '2025-02-03T08:00:00.000Z', products: ['Gemini Apps'], attachedFiles: ['x.png'], safeHtmlItem: [{ html: '<p>Earlier answer &amp; more</p>' }] },
  { header: 'Gemini Apps', title: 'Used Gemini Apps', time: '2025-02-03T07:00:00.000Z', products: ['Gemini Apps'] },
  { header: 'Search', title: 'Searched for cats', time: '2025-02-03T07:00:00.000Z', products: ['Search'] },
  { header: 'Gemini Apps', title: 'Prompted Next day', time: '2025-02-04T10:00:00.000Z', products: ['Gemini Apps'] },
];

/* ------------------------------ parsers ------------------------------ */

test('chatgpt: walks current_node to a linear conversation, drops other branches, tool/system, counts attachments', () => {
  const out = parseChatGpt(CHATGPT);
  assert.equal(out.length, 2); // empty mapping and garbage dropped
  const c = out[0];
  assert.equal(c.source, 'chatgpt');
  assert.equal(c.externalId, 'conv-1');
  assert.equal(c.title, 'Planning a Lisbon trip');
  assert.deepEqual(c.messages.map((m) => m.role), ['user', 'assistant', 'user', 'assistant']);
  assert.ok(!c.messages.some((m) => /OLD BRANCH/.test(m.text)));
  assert.equal(c.messages[2].text, 'What about this photo of a flat?');
  assert.equal(c.skipped.attachments, 1);
  assert.equal(c.skipped.nonConversation, 2); // hidden system + tool
  assert.equal(c.startedAt, new Date(1700000000500).toISOString());
  assert.equal(c.messages[0].at, new Date(1700000010000).toISOString());
});

test('chatgpt: missing current_node, title and timestamps are tolerated', () => {
  const c = parseChatGpt(CHATGPT)[1];
  assert.equal(c.title, 'Untitled conversation');
  assert.equal(c.startedAt, null);
  assert.equal(c.messages.length, 1);
  assert.equal(c.messages[0].at, null);
});

test('chatgpt: a parent cycle cannot hang the walk', () => {
  const cyc = [{ id: 'x', title: 'cycle', current_node: 'a', mapping: { a: node('a', 'b', [], { author: { role: 'user' }, content: { content_type: 'text', parts: ['hi there'] } }), b: node('b', 'a', ['a'], { author: { role: 'assistant' }, content: { content_type: 'text', parts: ['yo'] } }) } }];
  assert.equal(parseChatGpt(cyc)[0].messages.length, 2);
});

test('claude: maps sender, falls back to content blocks, skips system and blank, counts attachments', () => {
  const out = parseClaude(CLAUDE);
  assert.equal(out.length, 1);
  const c = out[0];
  assert.equal(c.externalId, 'c-uuid-1');
  assert.deepEqual(c.messages.map((m) => [m.role, m.text]), [['user', 'How do I split this function?'], ['assistant', 'Extract the tokenizer first.']]);
  assert.equal(c.skipped.attachments, 2);
  assert.equal(c.skipped.nonConversation, 1);
  assert.equal(c.skipped.empty, 1);
  assert.equal(c.startedAt, '2024-05-01T10:00:00.000Z');
});

test('gemini: groups prompts by day, strips html, orders chronologically, skips other products', () => {
  const out = parseGemini(GEMINI);
  assert.deepEqual(out.map((c) => c.externalId), ['gemini-2025-02-03', 'gemini-2025-02-04']);
  const d = out[0];
  assert.deepEqual(d.messages.map((m) => m.role), ['user', 'assistant', 'user', 'assistant']);
  assert.equal(d.messages[0].text, 'Earlier question');
  assert.equal(d.messages[1].text, 'Earlier answer & more');
  assert.match(d.messages[3].text, /summary:\n- Ship it\n- Fix tests/);
  assert.equal(d.skipped.attachments, 1);
  assert.ok(d.skipped.nonConversation >= 1);
  assert.equal(out[1].messages.length, 1); // prompt without a reply is kept
  assert.throws(() => parseGemini({ nope: 1 }), /Takeout/);
});

test('transcript: recognises speaker labels in plain, bold and markdown styles', () => {
  const t = 'You: What is pgvector?\nIt is a Postgres extension.\n\n**ChatGPT:** An extension for vectors.\n## User\nThanks\n### Assistant\nWelcome';
  const c = parseTranscript(t, 'chat.md')[0];
  assert.equal(c.title, 'chat');
  assert.deepEqual(c.messages.map((m) => m.role), ['user', 'assistant', 'user', 'assistant']);
  assert.match(c.messages[0].text, /What is pgvector\?\nIt is a Postgres extension\./);
});

test('transcript: unlabelled text is kept whole as one note, and re-parsing gives the same id', () => {
  const a = parseTranscript('Just some notes\nabout a thing', 'n.txt')[0];
  assert.deepEqual(a.messages.map((m) => m.role), ['note']);
  assert.equal(a.externalId, parseTranscript('Just some notes\nabout a thing', 'other.txt')[0].externalId);
  assert.throws(() => parseTranscript('   '), /empty/);
});

test('memory list: one fact per line, bullets and numbering stripped, duplicates and headings dropped', () => {
  const c = parseMemoryList('Things I know:\n- Lives in Berlin\n* Prefers TypeScript\n1. Vegetarian\n- lives in berlin\n\n## Work\n')[0];
  assert.deepEqual(c.messages.map((m) => m.text), ['Lives in Berlin', 'Prefers TypeScript', 'Vegetarian']);
  assert.equal(c.skipped.nonConversation, 2);
  assert.throws(() => parseMemoryList('\n\n'), /No facts/);
});

test('detectJsonSource tells the exports apart and parseAiExport rejects bad JSON clearly', () => {
  assert.equal(detectJsonSource(CHATGPT), 'chatgpt');
  assert.equal(detectJsonSource(CLAUDE), 'claude');
  assert.equal(detectJsonSource(GEMINI), 'gemini');
  assert.equal(detectJsonSource([{ x: 1 }]), null);
  assert.throws(() => parseAiExport('chatgpt', '{not json'), /not valid JSON/);
  assert.throws(() => parseAiExport('claude', JSON.stringify(CHATGPT)), /looks like a ChatGPT export/);
  assert.equal(parseAiExport('claude', '﻿' + JSON.stringify(CLAUDE)).length, 1);
});

/* ------------------------------ windows and packets ------------------------------ */

const longConv = (n: number, chars = 900): NormalizedConversation => ({
  source: 'claude', externalId: 'long', title: 'Long one', startedAt: '2024-01-01T00:00:00.000Z', skipped: { attachments: 0, nonConversation: 0, empty: 0 },
  messages: Array.from({ length: n }, (_, i) => ({ role: i % 2 ? 'assistant' as const : 'user' as const, text: `m${i} ` + 'word '.repeat(chars / 5), at: new Date(Date.UTC(2024, 0, 1, 0, i)).toISOString() })),
});

test('windows: long conversations split near 3500 chars with overlap; every message is covered', () => {
  const c = longConv(30);
  const ws = windowConversation(c);
  assert.ok(ws.length > 5);
  for (const w of ws) assert.ok(w.text.length <= WINDOW_TARGET + 80, `window ${w.index} is ${w.text.length}`);
  for (let i = 0; i < 30; i++) assert.ok(ws.some((w) => w.text.includes(`m${i} `)), `m${i} missing`);
  // overlap: the last message of window 0 reappears at the start of window 1
  const last0 = ws[0].text.split('\n\n').pop()!.slice(-60);
  assert.ok(ws[1].text.includes(last0));
  assert.match(ws[1].text, /part 2 of /);
  assert.equal(ws[1].at !== null, true);
});

test('windows: one huge message is split on boundaries and a short chat is a single window without part label', () => {
  const huge = longConv(1, 12000);
  const ws = windowConversation(huge);
  assert.ok(ws.length >= 3);
  assert.ok(ws.every((w) => w.text.length <= WINDOW_TARGET + 80));
  const short = windowConversation(longConv(2, 100));
  assert.equal(short.length, 1);
  assert.ok(!/part 1 of/.test(short[0].text));
});

test('packets: source tag, original time kept, private, stable hash independent of import time and id', () => {
  const c = parseChatGpt(CHATGPT)[0];
  const a = conversationToPackets(c, { importId: 'imp_aaaaaaaa', fallbackTime: new Date('2030-01-01') });
  const b = conversationToPackets(c, { importId: 'imp_bbbbbbbb', fallbackTime: new Date('2031-01-01') });
  assert.equal(a[0].source, 'import:chatgpt');
  assert.equal(a[0].event_time.toISOString(), new Date(1700000010000).toISOString());
  assert.equal(a[0].metadata.visibility, 'private');
  assert.deepEqual(a.map((p) => p.hash), b.map((p) => p.hash));
  const undated = conversationToPackets(parseChatGpt(CHATGPT)[1], { importId: 'imp_aaaaaaaa', fallbackTime: new Date('2030-01-01') });
  assert.equal(undated[0].event_time.toISOString(), '2030-01-01T00:00:00.000Z');
  assert.equal(undated[0].metadata.time_is_original, false);
});

test('sanitize: untrusted chunk bodies are clamped and bad entries dropped', () => {
  const ok = sanitizeConversations([
    { source: 'claude', externalId: 'x', title: 't\u0000', startedAt: 'nope', messages: [{ role: 'user', text: 'hello\u0000', at: 'bad' }, { role: 'root', text: 'x' }, { role: 'user', text: 5 }] },
    { source: 'evil', externalId: 'y', messages: [] },
    'str',
  ]);
  assert.equal(ok.length, 1);
  assert.equal(ok[0].messages.length, 1);
  assert.equal(ok[0].messages[0].text, 'hello');
  assert.equal(ok[0].startedAt, null);
  assert.throws(() => sanitizeConversations('x'), /list/);
  assert.throws(() => sanitizeConversations(new Array(201).fill({})), /At most/);
});

/* ------------------------------ commit / dry-run ------------------------------ */

function fakeDb() {
  const packets: any[] = [];
  const provenance: any[] = [];
  const db: ImportDb = {
    memoryPacket: {
      findMany: async ({ where }: any) => packets.filter((p) => where.hash.in.includes(p.hash)).map((p) => ({ hash: p.hash })),
      count: async ({ where }: any) => packets.filter((p) => p.metadata.import_id === where.metadata.equals).length,
      createMany: async ({ data }: any) => { packets.push(...data); return { count: data.length }; },
    },
    provenanceRecord: { createMany: async ({ data }: any) => { provenance.push(...data); return { count: data.length }; } },
  };
  return { db, packets, provenance };
}

const sendable = () => JSON.parse(JSON.stringify([...parseChatGpt(CHATGPT), ...parseClaude(CLAUDE), longConv(30)]));

test('dry-run writes nothing and reports counts', async () => {
  const { db, packets, provenance } = fakeDb();
  const r = await processChunk({ mode: 'dry-run', importId: 'imp_dry00001', userId: 'u', conversations: sendable() }, db);
  assert.equal(r.conversations, 4);
  assert.ok(r.packets >= 4 + 5);
  assert.equal(r.created, r.packets);
  assert.equal(r.duplicates, 0);
  assert.equal(r.skipped.attachments, 3);
  assert.equal(packets.length, 0);
  assert.equal(provenance.length, 0);
});

test('commit: private, low priority, pending embedding, original time, provenance per packet', async () => {
  const { db, packets, provenance } = fakeDb();
  const r = await processChunk({ mode: 'commit', importId: 'imp_commit01', userId: 'owner', conversations: sendable() }, db);
  assert.equal(packets.length, r.created);
  assert.equal(provenance.length, r.created);
  for (const p of packets) {
    assert.equal(p.is_public, false);
    assert.equal(p.priority, 'low');
    assert.equal(p.sensitivity, 'normal');
    assert.equal(p.embedding_status, 'pending');
    assert.match(p.source, /^import:/);
    assert.equal(typeof p.id, 'string');
  }
  const gpt = packets.find((p) => p.source === 'import:chatgpt');
  assert.equal(gpt.event_time.toISOString(), new Date(1700000010000).toISOString());
  const prov = provenance.find((x) => x.subjectId === gpt.id);
  assert.equal(prov.subjectType, 'memory_packet');
  assert.equal(prov.contentHash, gpt.hash);
  assert.equal(prov.source, 'import:chatgpt');
  assert.equal(prov.signals.kind, 'ai_chat_import');
});

test('re-importing the same export creates zero duplicates, even under a new importId', async () => {
  const { db, packets } = fakeDb();
  const first = await processChunk({ mode: 'commit', importId: 'imp_first001', userId: 'u', conversations: sendable() }, db);
  const n = packets.length;
  const again = await processChunk({ mode: 'commit', importId: 'imp_second02', userId: 'u', conversations: sendable() }, db);
  assert.equal(again.created, 0);
  assert.equal(again.duplicates, first.packets);
  assert.equal(packets.length, n);
  const dry = await processChunk({ mode: 'dry-run', importId: 'imp_second02', userId: 'u', conversations: sendable() }, db);
  assert.equal(dry.created, 0);
  assert.equal(dry.duplicates, dry.packets);
});

test('per-import cap stops writing, reports overCap with a clear message, and is resumable', async () => {
  const { db, packets } = fakeDb();
  const env = { AI_IMPORT_MAX_PACKETS: '6' } as unknown as NodeJS.ProcessEnv;
  const r = await processChunk({ mode: 'commit', importId: 'imp_capped01', userId: 'u', conversations: [longConv(30)], env }, db);
  assert.equal(r.created, 6);
  assert.ok(r.overCap > 0);
  assert.match(r.message!, /at most 6 packets per import/);
  assert.equal(packets.length, 6);
  const next = await processChunk({ mode: 'commit', importId: 'imp_capped01', userId: 'u', conversations: [longConv(30)], env }, db);
  assert.equal(next.created, 0); // cap already used by this import
  assert.equal(next.duplicates, 6);
});

test('bad importId is rejected', async () => {
  const { db } = fakeDb();
  await assert.rejects(processChunk({ mode: 'commit', importId: 'x', userId: 'u', conversations: [] }, db), /importId/);
});

/* ------------------------------ zip reader ------------------------------ */

function makeZip(files: Record<string, string>, store = false): Buffer {
  const locals: Buffer[] = []; const central: Buffer[] = []; let offset = 0;
  for (const [name, content] of Object.entries(files)) {
    const nb = Buffer.from(name); const raw = Buffer.from(content); const comp = store ? raw : deflateRawSync(raw);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(store ? 0 : 8, 8); lh.writeUInt32LE(comp.length, 18); lh.writeUInt32LE(raw.length, 22); lh.writeUInt16LE(nb.length, 26);
    locals.push(lh, nb, comp);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(store ? 0 : 8, 10); ch.writeUInt32LE(comp.length, 20); ch.writeUInt32LE(raw.length, 24); ch.writeUInt16LE(nb.length, 28); ch.writeUInt32LE(offset, 42);
    central.push(ch, nb); offset += 30 + nb.length + comp.length;
  }
  const cd = Buffer.concat(central); const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(Object.keys(files).length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, end]);
}

test('zip reader pulls only the conversation files out of an export zip (browser-safe, no dependency)', async () => {
  const zip = makeZip({
    'user-abc/conversations-000.json': JSON.stringify(CHATGPT),
    'user-abc/conversations-001.json': '[]',
    'user-abc/chat.html': '<html/>',
    'user-abc/message_feedback.json': '[]',
  });
  const got = await readZipTexts(new Blob([new Uint8Array(zip)]), ZIP_MATCHERS.chatgpt);
  assert.deepEqual(got.map((g) => g.name), ['user-abc/conversations-000.json', 'user-abc/conversations-001.json']);
  assert.equal(parseChatGpt(JSON.parse(got[0].text)).length, 2);
  const stored = await readZipTexts(new Blob([new Uint8Array(makeZip({ 'Takeout/My Activity/Gemini Apps/MyActivity.json': JSON.stringify(GEMINI) }, true))]), ZIP_MATCHERS.gemini);
  assert.equal(parseGemini(JSON.parse(stored[0].text)).length, 2);
  await assert.rejects(readZipTexts(new Blob([new Uint8Array(Buffer.from('not a zip at all'))]), () => true), /not a readable zip/);
});
