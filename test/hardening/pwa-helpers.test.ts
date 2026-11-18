import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isPrivatePath,
  detectInstallPlatform,
  isIosSafari,
  isInstallDismissed,
  buildShareData,
  normalizeBadgeCount,
  INSTALL_SNOOZE_MS,
} from '../../src/lib/pwa/helpers';

test('isPrivatePath treats public surfaces as non-private', () => {
  assert.equal(isPrivatePath('/console'), true);
  assert.equal(isPrivatePath('/memory'), true);
  assert.equal(isPrivatePath('/ask'), false);
  assert.equal(isPrivatePath('/p/someone'), false);
  assert.equal(isPrivatePath('/login'), false);
  assert.equal(isPrivatePath('/offline'), false);
  assert.equal(isPrivatePath(null), false);
  assert.equal(isPrivatePath('/askew'), true);
});

test('detectInstallPlatform', () => {
  assert.equal(detectInstallPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'), 'ios');
  assert.equal(detectInstallPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X)', 5), 'ios');
  assert.equal(detectInstallPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X)', 0), 'other');
  assert.equal(detectInstallPlatform('Mozilla/5.0 (Linux; Android 14)'), 'android');
});

test('isIosSafari excludes third-party iOS browsers', () => {
  assert.equal(isIosSafari('Mozilla/5.0 (iPhone) AppleWebKit Version/17 Mobile Safari/604.1'), true);
  assert.equal(isIosSafari('Mozilla/5.0 (iPhone) AppleWebKit CriOS/120 Mobile Safari/604.1'), false);
});

test('isInstallDismissed honours the snooze window and bad values', () => {
  const now = 1_000_000_000_000;
  assert.equal(isInstallDismissed(null, now), false);
  assert.equal(isInstallDismissed('abc', now), false);
  assert.equal(isInstallDismissed(String(now + 1000), now), false);
  assert.equal(isInstallDismissed(String(now - 1000), now), true);
  assert.equal(isInstallDismissed(String(now - INSTALL_SNOOZE_MS - 1), now), false);
});

test('buildShareData trims and omits empty text', () => {
  assert.deepEqual(buildShareData({ title: '  Hi ', url: 'https://x.y' }), { title: 'Hi', url: 'https://x.y' });
  assert.deepEqual(buildShareData({ title: '', text: ' t ', url: 'u' }), { title: 'Identity Prism', text: 't', url: 'u' });
});

test('normalizeBadgeCount only accepts real positive counts', () => {
  assert.equal(normalizeBadgeCount(3), 3);
  assert.equal(normalizeBadgeCount(3.9), 3);
  assert.equal(normalizeBadgeCount(0), null);
  assert.equal(normalizeBadgeCount(-2), null);
  assert.equal(normalizeBadgeCount(NaN), null);
  assert.equal(normalizeBadgeCount('5'), null);
  assert.equal(normalizeBadgeCount(1e9), 99999);
});
