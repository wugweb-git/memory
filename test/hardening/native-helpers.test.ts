import { test } from 'node:test';
import assert from 'node:assert/strict';
import { geoUrl, mailtoUrl, mapsWebUrl, normalizePhone, smsUrl, telUrl } from '../../src/lib/native/deep-links';
import { attachPlaceToBody, buildPlace, formatPlace, locationErrorMessage, mapGeoError, permissionLabel } from '../../src/lib/native/location';
import { exportFileName, formatBytes, isQuotaError, mapStorageError, persistStateLabel, shapeEstimate, storageErrorMessage } from '../../src/lib/native/storage';
import { buildImageCaptureBody, dataUrlBytes, mapCameraError, planDownscale } from '../../src/lib/native/camera';
import { clampIdleThreshold, decodeNdefRecord, describeBattery, describeNetwork, isWebPlusScheme, mediaSessionMetadata, protocolHandlerUrl, speakableText } from '../../src/lib/native/device-helpers';
import { detectCapabilities, NO_CAPABILITIES } from '../../src/lib/native/capabilities';
import { CAPABILITY_TABLE } from '../../src/lib/native/capability-table';
import { normalizeContacts } from '../../src/lib/native/adapter/web';

test('deep links', () => {
  assert.equal(normalizePhone(' +1 (555) 010-9999 '), '+15550109999');
  assert.equal(normalizePhone('12'), null);
  assert.equal(telUrl('020 7946 0958'), 'tel:02079460958');
  assert.equal(smsUrl('+4915123456', 'Hi & bye'), 'sms:+4915123456?body=Hi%20%26%20bye');
  assert.equal(smsUrl('+4915123456'), 'sms:+4915123456');
  assert.equal(mailtoUrl({ to: ['a@b.com', 'bad'], subject: 'Hi there', body: 'x&y', cc: ['c@d.org'] }), 'mailto:a@b.com?cc=c%40d.org&subject=Hi%20there&body=x%26y');
  assert.equal(mailtoUrl({ to: 'nope' }), null);
  assert.equal(geoUrl(52.520008, 13.404954), 'geo:52.52001,13.40495');
  assert.equal(geoUrl(52.5, 13.4, 'Cafe Bar'), 'geo:52.5,13.4?q=52.5,13.4(Cafe%20Bar)');
  assert.equal(geoUrl(91, 0), null);
  assert.equal(mapsWebUrl(1, 2), 'https://www.google.com/maps/search/?api=1&query=1%2C2');
});

test('location: error mapping, place shaping, old payloads preserved', () => {
  assert.equal(mapGeoError(1), 'denied');
  assert.equal(mapGeoError(2), 'unavailable');
  assert.equal(mapGeoError(3), 'timeout');
  assert.match(locationErrorMessage('denied'), /denied/);
  assert.match(locationErrorMessage('timeout'), /10 seconds/);
  assert.equal(permissionLabel('granted'), 'Allowed');
  assert.equal(permissionLabel('denied'), 'Blocked');
  assert.equal(permissionLabel('prompt'), 'Will ask');
  assert.equal(permissionLabel(null), 'Unknown');
  const at = new Date('2026-01-01T00:00:00Z');
  const p = buildPlace({ latitude: 52.5200081, longitude: 13.4049541, accuracy: 19.6 }, at)!;
  assert.deepEqual([p.lat, p.lon, p.accuracy, p.timestamp], [52.52001, 13.40495, 20, at.toISOString()]);
  assert.match(p.mapsUrl, /^https:\/\/www\.google\.com\/maps/);
  assert.ok(p.geoUri.startsWith('geo:'));
  assert.equal(formatPlace(p), '52.52001, 13.40495 (about 20 m)');
  assert.equal(buildPlace({ latitude: 200, longitude: 0 }), null);
  const old = { type: 'note', raw_payload: { content: 'x' }, trace_json: { origin: 'a' } };
  const withP = attachPlaceToBody(old, p);
  assert.deepEqual((withP.raw_payload as any).content, 'x');
  assert.deepEqual((withP.raw_payload as any).place, p);
  assert.equal((withP.trace_json as any).origin, 'a');
  assert.equal(attachPlaceToBody(old, null), old);
  assert.equal(attachPlaceToBody({ type: 'x', raw_payload: 'text' }, p).raw_payload, 'text');
});

test('storage: formatting, estimate shaping, error mapping', () => {
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(1536), '1.5 KB');
  assert.equal(formatBytes(5 * 1024 * 1024), '5 MB');
  assert.equal(formatBytes(NaN), 'unknown');
  assert.equal(shapeEstimate({ usage: 10, quota: 100 }).level, 'ok');
  assert.equal(shapeEstimate({ usage: 85, quota: 100 }).level, 'warn');
  assert.equal(shapeEstimate({ usage: 99, quota: 100 }).level, 'full');
  assert.equal(shapeEstimate(undefined).level, 'unknown');
  assert.equal(shapeEstimate({ usage: 5, quota: 0 }).level, 'unknown');
  assert.ok(isQuotaError({ name: 'QuotaExceededError' }));
  assert.ok(isQuotaError({ code: 22 }));
  assert.ok(!isQuotaError(new Error('x')));
  assert.equal(mapStorageError({ name: 'QuotaExceededError' }), 'quota');
  assert.equal(mapStorageError({ name: 'SecurityError' }), 'unavailable');
  assert.equal(mapStorageError(null), 'unknown');
  assert.match(storageErrorMessage('quota'), /full/);
  assert.match(persistStateLabel(true), /Protected/);
  assert.equal(exportFileName('Prism Memory', '.json', new Date('2026-11-19T10:00:00Z')), 'prism-memory-2026-11-19.json');
});

test('camera: downscale plan, error mapping, payload', () => {
  assert.deepEqual(planDownscale(4000, 3000), { width: 1600, height: 1200, scaled: true });
  assert.deepEqual(planDownscale(3000, 4000), { width: 1200, height: 1600, scaled: true });
  assert.deepEqual(planDownscale(800, 600), { width: 800, height: 600, scaled: false });
  assert.equal(planDownscale(0, 10).width, 0);
  assert.equal(mapCameraError({ name: 'NotAllowedError' }), 'denied');
  assert.equal(mapCameraError({ name: 'NotFoundError' }), 'no-device');
  assert.equal(mapCameraError({ name: 'NotReadableError' }), 'busy');
  assert.equal(mapCameraError(null), 'unknown');
  const url = 'data:image/jpeg;base64,' + 'A'.repeat(400);
  assert.equal(dataUrlBytes(url), 300);
  const b = buildImageCaptureBody({ dataUrl: url, width: 10, height: 5, mime: 'image/jpeg', name: 'p.jpg' }, new Date('2026-01-01T00:00:00Z'));
  assert.equal(b.type, 'camera_image');
  assert.equal(b.raw_payload.bytes, 300);
});

test('device helpers', () => {
  assert.deepEqual(describeNetwork(false), { label: 'Offline', saveData: false, constrained: true });
  assert.equal(describeNetwork(true, { effectiveType: '4g', saveData: true }).label, 'Online (4g), data saver on');
  assert.equal(describeNetwork(true, { effectiveType: '2g' }).constrained, true);
  assert.equal(describeBattery({ level: 0.567, charging: true }), '57%, charging');
  assert.equal(describeBattery(null), 'Not reported');
  assert.equal(decodeNdefRecord({ recordType: 'text', data: new TextEncoder().encode('hi').buffer }), 'hi');
  assert.equal(decodeNdefRecord({ recordType: 'mime', data: new ArrayBuffer(1) }), null);
  assert.equal(speakableText('# Title\n**bold** see https://a.com/x'), 'Title bold see link');
  assert.equal(mediaSessionMetadata('  ').title, 'Untitled');
  assert.equal(clampIdleThreshold(5), 60000);
  assert.equal(protocolHandlerUrl('https://a.com/'), 'https://a.com/share-target/review?url=%s');
  assert.ok(isWebPlusScheme('web+prism') && !isWebPlusScheme('http'));
});

test('normalizeContacts', () => {
  assert.deepEqual(normalizeContacts([{ name: ['Ada'], email: ['a@x.io', ''], tel: ['123'] }, { name: [], email: [], tel: [] }, null]), [{ name: 'Ada', emails: ['a@x.io'], phones: ['123'] }]);
  assert.deepEqual(normalizeContacts('nope'), []);
});

test('capability detection is feature based and safe with no navigator', () => {
  assert.deepEqual(detectCapabilities({}), NO_CAPABILITIES);
  const caps = detectCapabilities({
    navigator: {
      userAgent: 'Mozilla/5.0 (Linux; Android 14) Chrome/120', share() {}, canShare: () => true,
      contacts: { select() {} }, wakeLock: { request() {} }, vibrate() {}, geolocation: { getCurrentPosition() {} },
      clipboard: { writeText() {} }, storage: { estimate() {}, persist() {} }, mediaDevices: { getUserMedia() {} },
    },
    File: class {},
    window: { matchMedia: () => ({ matches: true }) },
  });
  assert.equal(caps.android, true);
  assert.equal(caps.standalone, true);
  assert.equal(caps.share && caps.shareFiles && caps.contactPicker && caps.wakeLock && caps.vibrate && caps.geolocation, true);
  assert.equal(caps.clipboardWrite, true);
  assert.equal(caps.clipboardRead, false);
  assert.equal(caps.camera && caps.storageEstimate && caps.storagePersist, true);
  assert.equal(caps.webNfc, false);
  assert.equal(caps.badging, false);
});

test('capability table covers every capability key once', () => {
  const keys = CAPABILITY_TABLE.map((r) => r.key);
  assert.equal(new Set(keys).size, keys.length);
  const detected = Object.keys(NO_CAPABILITIES).filter((k) => k !== 'android' && k !== 'standalone');
  for (const k of detected) assert.ok(keys.includes(k as any), `missing row for ${k}`);
});
