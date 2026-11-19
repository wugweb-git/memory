import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appLaunchers, buildIntentUrl, driveFileUrl, openAppLaunchers, spotifyUri, type AppLauncher } from '../../src/lib/native/apps';
import { AI_HANDOFF_MAX_CHARS, AI_PROVIDERS, aiLaunchers, buildAiPrompt, truncateForHandoff } from '../../src/lib/native/apps-ai';

// Documented Chrome Android format: intent:DATA#Intent;scheme=...;package=...;S.browser_fallback_url=...;end
const INTENT_RE = /^intent:[^#;]*#Intent;scheme=[a-z][a-z0-9+.-]*;(package=[A-Za-z][\w]*(\.[A-Za-z][\w]*)+;)?S\.browser_fallback_url=[^;]+;end$/;

function assertValid(l: AppLauncher) {
  if (l.kind === 'intent') {
    assert.match(l.url, INTENT_RE, `${l.id}: ${l.url}`);
    const fb = decodeURIComponent(/S\.browser_fallback_url=([^;]+);/.exec(l.url)![1]);
    assert.match(fb, /^https?:\/\//, `${l.id} fallback`);
    assert.equal(fb, l.fallbackUrl, `${l.id} fallback matches`);
  } else {
    assert.match(l.fallbackUrl, /^https?:\/\//);
  }
}

test('buildIntentUrl follows the documented format and encodes the fallback', () => {
  const u = buildIntentUrl({ data: '//track/abc123', scheme: 'spotify', package: 'com.spotify.music', fallbackUrl: 'https://open.spotify.com/track/abc123?x=1&y=2' });
  assert.equal(u, 'intent://track/abc123#Intent;scheme=spotify;package=com.spotify.music;S.browser_fallback_url=https%3A%2F%2Fopen.spotify.com%2Ftrack%2Fabc123%3Fx%3D1%26y%3D2;end');
  assert.match(u, INTENT_RE);
});

test('buildIntentUrl rejects unsafe input', () => {
  const ok = { data: '//x', scheme: 'https', package: 'com.a.b', fallbackUrl: 'https://a.com' };
  assert.throws(() => buildIntentUrl({ ...ok, scheme: 'Bad Scheme' }), RangeError);
  assert.throws(() => buildIntentUrl({ ...ok, package: 'nodots' }), RangeError);
  assert.throws(() => buildIntentUrl({ ...ok, fallbackUrl: 'javascript:alert(1)' }), RangeError);
  assert.throws(() => buildIntentUrl({ ...ok, data: '//x;end;S.foo=bar' }), RangeError);
  assert.throws(() => buildIntentUrl({ ...ok, data: '//x#frag' }), RangeError);
});

test('every launcher for a rich context is valid and degrades to the web', () => {
  const list = appLaunchers({
    title: 'Dinner plan', text: 'Meet at 8 & bring wine', url: 'https://example.com/menu?a=1', phone: '+1 (555) 010-9999',
    email: 'a@b.com', lat: 52.52, lng: 13.405, query: 'jazz', spotify: { type: 'track', id: '4uLU6hMCjMI75M1A2tKUQC' },
    meetingId: '123 4567 8901', event: { title: 'Dinner', start: new Date(Date.UTC(2026, 0, 2, 19)) },
  });
  assert.ok(list.length > 15);
  const ids = new Set(list.map((l) => l.id));
  for (const id of ['whatsapp.share', 'telegram.share', 'gmail.compose', 'mail.mailto', 'maps.open', 'waze.navigate', 'spotify.open', 'spotify.search', 'zoom.join', 'gcal.create', 'gmail.search', 'chrome.open']) assert.ok(ids.has(id), id);
  assert.equal(ids.size, list.length, 'unique ids');
  list.forEach(assertValid);
});

test('WhatsApp share carries the text and phone', () => {
  const l = appLaunchers({ text: 'Hi there', phone: '+49 151 2345' }).find((x) => x.id === 'whatsapp.share')!;
  assert.ok(l.fallbackUrl.startsWith('https://wa.me/491512345?text=Hi%20there'));
  assert.ok(decodeURIComponent(l.url).includes('phone=491512345'));
});

test('Gmail compose prefills to/subject/body and mailto has an https fallback', () => {
  const list = appLaunchers({ title: 'Note', text: 'Body & more', email: 'me@x.com' });
  const g = list.find((x) => x.id === 'gmail.compose')!;
  assert.ok(g.url.startsWith('intent:me@x.com?subject=Note&body=Body%20%26%20more#Intent;scheme=mailto;package=com.google.android.gm;'));
  const m = list.find((x) => x.id === 'mail.mailto')!;
  assert.equal(m.url, 'mailto:me@x.com?subject=Note&body=Body%20%26%20more');
  assert.match(m.fallbackUrl, /^https:\/\/mail\.google\.com\//);
});

test('Spotify ids are validated', () => {
  assert.equal(spotifyUri('track', '4uLU6hMCjMI75M1A2tKUQC'), 'spotify:track:4uLU6hMCjMI75M1A2tKUQC');
  assert.equal(spotifyUri('track', 'bad id!'), null);
  assert.equal(spotifyUri('show', '4uLU6hMCjMI75M1A2tKUQC'), null);
  assert.ok(!appLaunchers({ spotify: { type: 'track', id: 'x y' } }).some((l) => l.id === 'spotify.open'));
});

test('invalid coordinates or phone produce no launcher', () => {
  assert.ok(!appLaunchers({ lat: 999, lng: 0 }).some((l) => l.id === 'maps.open'));
  assert.ok(!appLaunchers({ text: 'x', phone: '12' }).some((l) => l.id === 'signal.chat'));
});

test('open-app launchers are all valid and payment apps carry no payment params', () => {
  const list = openAppLaunchers();
  list.forEach(assertValid);
  assert.ok(list.length >= 25);
  for (const id of ['phonepe.open', 'gpay.open']) {
    const l = list.find((x) => x.id === id)!;
    assert.ok(!/amount|pa=|upi|payee/i.test(l.url));
  }
  assert.equal(driveFileUrl('1AbCdEfGhIjKlMnOp'), 'https://drive.google.com/open?id=1AbCdEfGhIjKlMnOp');
  assert.equal(driveFileUrl('x'), null);
});

test('AI handoff: prompt truncation and preview', () => {
  const short = truncateForHandoff('hello');
  assert.deepEqual(short, { text: 'hello', truncated: false });
  const long = truncateForHandoff('a'.repeat(5000));
  assert.equal(long.text.length, AI_HANDOFF_MAX_CHARS);
  assert.equal(long.truncated, true);
  assert.ok(long.text.endsWith('…'));
  const b = buildAiPrompt('Summarise', 'note body');
  assert.equal(b.text, 'Summarise\n\nnote body');
  assert.equal(buildAiPrompt('', 'only context').text, 'only context');
});

test('AI launchers: five providers, valid intents, prompt prefilled where supported', () => {
  const list = aiLaunchers('What is next?', 'my note');
  assert.equal(list.length, 5);
  assert.deepEqual(AI_PROVIDERS.map((p) => p.id), ['chatgpt', 'claude', 'gemini', 'perplexity', 'copilot']);
  list.forEach(assertValid);
  const by = Object.fromEntries(list.map((l) => [l.id, l]));
  assert.ok(by['ai.chatgpt'].url.includes('package=com.openai.chatgpt'));
  assert.ok(by['ai.claude'].url.includes('package=com.anthropic.claude'));
  assert.ok(by['ai.gemini'].url.includes('package=com.google.android.apps.bard'));
  assert.ok(by['ai.perplexity'].url.includes('package=ai.perplexity.app.android'));
  assert.ok(by['ai.copilot'].url.includes('package=com.microsoft.copilot'));
  assert.equal(by['ai.chatgpt'].fallbackUrl, 'https://chatgpt.com/?q=What%20is%20next%3F%0A%0Amy%20note');
  assert.ok(by['ai.claude'].fallbackUrl.startsWith('https://claude.ai/new?q='));
  assert.equal(by['ai.gemini'].fallbackUrl, 'https://gemini.google.com/app');
  assert.equal(by['ai.gemini'].promptPrefill, false);
  assert.ok(by['ai.perplexity'].fallbackUrl.startsWith('https://www.perplexity.ai/search?q='));
});

test('AI launchers truncate long context', () => {
  const list = aiLaunchers('p', 'x'.repeat(9000));
  assert.ok(list.every((l) => l.truncated));
  assert.ok(decodeURIComponent(list[0].fallbackUrl.split('q=')[1]).length <= AI_HANDOFF_MAX_CHARS);
});
