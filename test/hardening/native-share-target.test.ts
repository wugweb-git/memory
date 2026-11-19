import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildShareCaptureBody, buildSharedFileCaptureBody, buildShareData, classifySharedFile, composeShareText,
  decodeReviewQuery, encodeReviewQuery, extractFirstUrl, isEmptyShare, MAX_QUERY_TEXT, normalizeSharedFields, shareKind,
} from '../../src/lib/native/share-data';
import manifest from '../../public/manifest.json' with { type: 'json' };

test('Android often sends the link inside text: recover it', () => {
  const p = normalizeSharedFields({ title: 'Article', text: 'Great read https://example.com/a?b=1.', url: '' });
  assert.equal(p.url, 'https://example.com/a?b=1');
  assert.equal(p.text, 'Great read .'.trim());
  assert.equal(shareKind({ ...p, text: '' }), 'link');
});

test('non-http(s) urls are dropped', () => {
  assert.equal(normalizeSharedFields({ url: 'javascript:alert(1)' }).url, null);
  assert.equal(normalizeSharedFields({ url: 'data:text/html,hi' }).url, null);
  assert.equal(normalizeSharedFields({ url: 'intent://x#Intent;end' }).url, null);
});

test('non-string fields are ignored and lengths capped', () => {
  const p = normalizeSharedFields({ title: 42, text: 'a'.repeat(50000), url: null });
  assert.equal(p.title, '');
  assert.equal(p.text.length, 20000);
  assert.ok(isEmptyShare(normalizeSharedFields({})));
});

test('extractFirstUrl trims trailing punctuation', () => {
  assert.equal(extractFirstUrl('see (https://a.com/x), ok'), 'https://a.com/x');
  assert.equal(extractFirstUrl('nothing here'), null);
});

test('review query round trips and caps text', () => {
  const p = { title: 'T', text: 'hello world', url: 'https://a.com/' };
  assert.deepEqual(decodeReviewQuery(new URLSearchParams(encodeReviewQuery(p))), p);
  const long = encodeReviewQuery({ title: '', text: 'x'.repeat(10000), url: null });
  assert.equal(new URLSearchParams(long).get('text')?.length, MAX_QUERY_TEXT);
});

test('capture body targets the existing /api/blob shape', () => {
  const now = new Date('2026-01-01T00:00:00Z');
  const note = buildShareCaptureBody({ title: 'T', text: 'body', url: 'https://a.com/' }, now);
  assert.equal(note.type, 'shared_note');
  assert.equal(note.source, 'web_share_target');
  assert.equal(note.raw_payload.content, 'body\nhttps://a.com/');
  assert.equal(note.trace_json.received_at, now.toISOString());
  assert.equal(buildShareCaptureBody({ title: '', text: '', url: 'https://a.com/' }).type, 'shared_link');
});

test('shared files are classified and bounded', () => {
  assert.equal(classifySharedFile('invite.ics', ''), 'calendar');
  assert.equal(classifySharedFile('x', 'text/calendar'), 'calendar');
  assert.equal(classifySharedFile('n.md', ''), 'text');
  assert.equal(classifySharedFile('photo.jpg', 'image/jpeg'), 'unsupported');
  const b = buildSharedFileCaptureBody({ name: 'a.txt', type: 'text/plain', text: 'z'.repeat(300000) });
  assert.equal(b.raw_payload.content.length, 200000);
  assert.equal(b.type, 'shared_text_file');
});

test('share helpers', () => {
  assert.equal(buildShareData({}), null);
  assert.deepEqual(buildShareData({ title: ' a ', text: '', url: 'https://x.y' }), { title: 'a', url: 'https://x.y' });
  assert.equal(composeShareText({ title: 'A', text: 'B', url: 'C' }), 'A\nB\nC');
});

test('manifest declares a valid share_target, shortcuts and protocol handler', () => {
  const m = manifest as any;
  assert.equal(m.share_target.action, '/share-target');
  assert.equal(m.share_target.method, 'POST');
  assert.equal(m.share_target.enctype, 'multipart/form-data');
  assert.deepEqual(Object.keys(m.share_target.params).sort(), ['files', 'text', 'title', 'url']);
  assert.ok(m.share_target.params.files[0].accept.includes('.ics'));
  const names = m.shortcuts.map((s: any) => s.name);
  for (const n of ['Capture note', 'Ask', 'Buffer']) assert.ok(names.includes(n));
  assert.ok(m.shortcuts.length <= 4);
  for (const s of m.shortcuts) assert.ok(s.url.startsWith('/'));
  assert.ok(m.protocol_handlers[0].url.includes('%s'));
  assert.ok(m.protocol_handlers[0].protocol.startsWith('web+'));
  assert.ok(m.id && m.categories && m.display_override);
});
