import { resolveEnd, type IcsEvent } from '../ics';
import { buildPlace, locationErrorMessage, mapGeoError } from '../location';
import { cameraErrorMessage, mapCameraError } from '../camera';
import { composeShareText } from '../share-data';
import type { PluginLoader } from './capacitor-shim';
import type { NativeAdapter, NotifyPermission, PickedContact } from './types';

/**
 * Capacitor implementation. Each method loads its plugin lazily and falls back to the web
 * implementation when the plugin is missing or throws, so a partial shell still works.
 */
export function createCapacitorAdapter(load: PluginLoader, web: NativeAdapter): NativeAdapter {
  const msg = (e: unknown, d: string) => (e instanceof Error ? e.message : d);
  const cancelled = (e: unknown) => /cancel|dismiss|user denied.*picker/i.test(msg(e, ''));

  return {
    impl: 'capacitor',

    calendar: {
      async addEvent(ev: IcsEvent, mode) {
        const p = await load('calendar');
        if (!p) return web.calendar.addEvent(ev, mode);
        try {
          await p.createEventWithPrompt({
            title: ev.title, location: ev.location, notes: ev.description, url: ev.url,
            startDate: ev.start.getTime(), endDate: resolveEnd(ev).getTime(), isAllDay: ev.allDay,
          });
          return { status: 'added', via: 'capacitor' };
        } catch (e) {
          return cancelled(e) ? { status: 'cancelled', via: 'capacitor' } : { status: 'failed', via: 'capacitor', message: msg(e, 'Calendar failed') };
        }
      },
    },

    contacts: {
      isSupported: () => true,
      async pick(opts) {
        const p = await load('contacts');
        if (!p) return web.contacts.pick(opts);
        try {
          const { contact } = await p.pickContact({ projection: { name: true, emails: true, phones: true } });
          if (!contact) return { status: 'cancelled', via: 'capacitor' };
          const c: PickedContact = {
            name: contact.name?.display ?? [contact.name?.given, contact.name?.family].filter(Boolean).join(' '),
            emails: (contact.emails ?? []).map((x) => x.address ?? '').filter(Boolean),
            phones: (contact.phones ?? []).map((x) => x.number ?? '').filter(Boolean),
          };
          return { status: 'ok', contacts: [c], via: 'capacitor' };
        } catch (e) {
          return cancelled(e) ? { status: 'cancelled', via: 'capacitor' } : { status: 'error', via: 'capacitor', message: msg(e, 'Contacts failed') };
        }
      },
    },

    location: {
      isSupported: () => true,
      async current(opts) {
        const p = await load('geolocation');
        if (!p) return web.location.current(opts);
        try {
          const pos = await p.getCurrentPosition({ enableHighAccuracy: Boolean(opts?.highAccuracy), timeout: opts?.timeoutMs ?? 10_000 });
          const place = buildPlace(pos.coords);
          if (!place) return { status: 'error', kind: 'unavailable', message: locationErrorMessage('unavailable'), via: 'capacitor' };
          return { status: 'ok', place, via: 'capacitor' };
        } catch (e) {
          const m = msg(e, '');
          const kind = /denied|permission/i.test(m) ? mapGeoError(1) : /timeout/i.test(m) ? mapGeoError(3) : mapGeoError(2);
          return { status: 'error', kind, message: locationErrorMessage(kind), via: 'capacitor' };
        }
      },
      async permission() {
        const p = await load('geolocation');
        if (!p) return web.location.permission();
        try {
          const s = (await p.checkPermissions()).location;
          return s === 'granted' ? 'granted' : s === 'denied' ? 'denied' : 'prompt';
        } catch {
          return null;
        }
      },
    },

    camera: {
      async capture(kind) {
        const p = kind === 'image' ? await load('camera') : null; // video capture stays on the web path
        if (!p) return web.camera.capture(kind);
        try {
          const r = await p.getPhoto({ quality: 80, resultType: 'dataUrl', source: 'CAMERA', width: 1600, correctOrientation: true });
          if (!r.dataUrl) return { status: 'cancelled', via: 'capacitor' };
          return { status: 'ok', image: { dataUrl: r.dataUrl, width: 0, height: 0, mime: `image/${r.format ?? 'jpeg'}` }, via: 'capacitor' };
        } catch (e) {
          if (cancelled(e)) return { status: 'cancelled', via: 'capacitor' };
          const k = mapCameraError({ name: /denied|permission/i.test(msg(e, '')) ? 'NotAllowedError' : '' });
          return { status: 'error', kind: k, message: cameraErrorMessage(k), via: 'capacitor' };
        }
      },
    },

    files: {
      pick: (o) => web.files.pick(o), // the system document picker is already native on Android
      async save(file) {
        const p = await load('filesystem');
        if (!p || typeof file.data !== 'string') return web.files.save(file);
        try {
          await p.writeFile({ path: file.name, data: file.data, directory: 'DOCUMENTS', encoding: 'utf8', recursive: true });
          return { status: 'saved', via: 'capacitor' };
        } catch (e) {
          return { status: 'error', via: 'capacitor', message: msg(e, 'Save failed') };
        }
      },
    },

    apps: {
      async open(l) {
        const p = await load('appLauncher');
        if (!p) return web.apps.open(l);
        try {
          if ((await p.canOpenUrl({ url: l.url })).value) {
            await p.openUrl({ url: l.url });
            return { status: 'launched', via: 'capacitor' };
          }
        } catch {
          /* fall through to the web fallback */
        }
        await p.openUrl({ url: l.fallbackUrl }).catch(() => undefined);
        return { status: 'fallback', via: 'capacitor' };
      },
      async isInstalled(url) {
        const p = await load('appLauncher');
        if (!p) return null;
        try {
          return (await p.canOpenUrl({ url })).value;
        } catch {
          return null;
        }
      },
    },

    share: {
      async share(input) {
        const p = await load('share');
        // Files need native file URIs from @capacitor/filesystem; keep the web path for those.
        if (!p || input.files?.length) return web.share.share(input);
        try {
          await p.share({ title: input.title, text: input.text, url: input.url });
          return 'shared';
        } catch (e) {
          return cancelled(e) ? 'cancelled' : web.share.share({ ...input, text: composeShareText(input), title: undefined, url: undefined });
        }
      },
    },

    notifications: {
      async permission() {
        const p = await load('localNotifications');
        if (!p) return web.notifications.permission();
        const d = (await p.checkPermissions().catch(() => ({ display: 'prompt' }))).display;
        return (d === 'granted' ? 'granted' : d === 'denied' ? 'denied' : 'default') as NotifyPermission;
      },
      async request() {
        const p = await load('localNotifications');
        if (!p) return web.notifications.request();
        const d = (await p.requestPermissions().catch(() => ({ display: 'denied' }))).display;
        return d === 'granted' ? 'granted' : 'denied';
      },
      async notify(title, body) {
        const p = await load('localNotifications');
        if (!p) return web.notifications.notify(title, body);
        try {
          await p.schedule({ notifications: [{ id: Date.now() % 2147483647, title, body }] });
          return true;
        } catch {
          return false;
        }
      },
    },
  };
}
