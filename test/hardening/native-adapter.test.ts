import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createNativeAdapter } from '../../src/lib/native/adapter';
import { createPluginLoader, isNativePlatform, type CalendarPlugin, type GeolocationPlugin, type AppLauncherPlugin, type ContactsPlugin } from '../../src/lib/native/adapter/capacitor-shim';

test('isNativePlatform reads window.Capacitor safely', () => {
  assert.equal(isNativePlatform({}), false);
  assert.equal(isNativePlatform({ Capacitor: {} }), false);
  assert.equal(isNativePlatform({ Capacitor: { isNativePlatform: () => true } }), true);
  assert.equal(isNativePlatform({ Capacitor: { isNativePlatform: () => { throw new Error('x'); } } }), false);
});

test('web adapter is selected outside a native shell', () => {
  assert.equal(createNativeAdapter({ native: false }).impl, 'web');
  assert.equal(createNativeAdapter({ native: true }).impl, 'capacitor');
});

test('plugin loader memoises and returns null for missing or failing plugins', async () => {
  let calls = 0;
  const load = createPluginLoader({
    share: async () => { calls++; return { share: async () => ({}) }; },
    camera: async () => { throw new Error('not installed'); },
  });
  assert.ok(await load('share'));
  assert.ok(await load('share'));
  assert.equal(calls, 1);
  assert.equal(await load('camera'), null);
  assert.equal(await load('calendar'), null);
});

test('capacitor adapter uses fake plugins', async () => {
  const seen: any = {};
  const geo: GeolocationPlugin = {
    getCurrentPosition: async (o) => { seen.geo = o; return { coords: { latitude: 52.5, longitude: 13.4, accuracy: 12 } }; },
    checkPermissions: async () => ({ location: 'granted' }),
    requestPermissions: async () => ({ location: 'granted' }),
  };
  const cal: CalendarPlugin = { createEventWithPrompt: async (o) => { seen.cal = o; } };
  const launcher: AppLauncherPlugin = {
    canOpenUrl: async ({ url }) => ({ value: url.startsWith('intent:installed') }),
    openUrl: async ({ url }) => { (seen.opened ??= []).push(url); return { completed: true }; },
  };
  const contacts: ContactsPlugin = { pickContact: async () => ({ contact: { name: { display: 'Ada' }, emails: [{ address: 'a@x.io' }], phones: [{ number: '123' }] } }) };
  const a = createNativeAdapter({ native: true, importers: { geolocation: async () => geo, calendar: async () => cal, appLauncher: async () => launcher, contacts: async () => contacts } });

  const loc = await a.location.current({ highAccuracy: true });
  assert.equal(loc.status, 'ok');
  assert.equal(loc.status === 'ok' && loc.via, 'capacitor');
  assert.deepEqual(seen.geo, { enableHighAccuracy: true, timeout: 10000 });
  assert.equal(await a.location.permission(), 'granted');

  const start = new Date('2026-03-15T09:30:00Z');
  const r = await a.calendar.addEvent({ title: 'Sync', start });
  assert.equal(r.status, 'added');
  assert.equal(seen.cal.startDate, start.getTime());
  assert.equal(seen.cal.endDate, start.getTime() + 3600000);

  const c = await a.contacts.pick();
  assert.deepEqual(c.status === 'ok' && c.contacts, [{ name: 'Ada', emails: ['a@x.io'], phones: ['123'] }]);

  assert.equal((await a.apps.open({ url: 'intent:installed#x', fallbackUrl: 'https://a.com' })).status, 'launched');
  assert.equal((await a.apps.open({ url: 'intent:missing#x', fallbackUrl: 'https://a.com' })).status, 'fallback');
  assert.deepEqual(seen.opened, ['intent:installed#x', 'https://a.com']);
  assert.equal(await a.apps.isInstalled('intent:installed#x'), true);
});

test('capacitor adapter maps plugin errors to the shared result shapes', async () => {
  const geo: GeolocationPlugin = {
    getCurrentPosition: async () => { throw new Error('User denied Geolocation'); },
    checkPermissions: async () => ({ location: 'denied' }),
    requestPermissions: async () => ({ location: 'denied' }),
  };
  const a = createNativeAdapter({ native: true, importers: { geolocation: async () => geo } });
  const r = await a.location.current();
  assert.equal(r.status === 'error' && r.kind, 'denied');
  assert.equal(await a.location.permission(), 'denied');
});

test('web adapter reports unknown for installed apps and unsupported contacts without a browser', async () => {
  const a = createNativeAdapter({ native: false });
  assert.equal(await a.apps.isInstalled('x'), null);
  assert.equal((await a.contacts.pick()).status, 'unsupported');
  assert.equal(a.contacts.isSupported(), false);
  assert.equal((await a.location.current()).status, 'error');
});
