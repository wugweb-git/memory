import { buildIcs, googleCalendarUrl, icsFileName } from '../ics';
import { buildPlace, LOCATION_TIMEOUT_MS, locationErrorMessage, mapGeoError } from '../location';
import { cameraErrorMessage, JPEG_QUALITY, mapCameraError, MAX_IMAGE_EDGE, planDownscale } from '../camera';
import { buildShareData, composeShareText } from '../share-data';
import type {
  AppsAdapter, CalendarAdapter, CameraAdapter, ContactsAdapter, FilesAdapter, LocationAdapter,
  NativeAdapter, NotificationsAdapter, NotifyPermission, PickedContact, ShareAdapter,
} from './types';

const hasWindow = () => typeof window !== 'undefined' && typeof document !== 'undefined';
const nav = (): any => (typeof navigator === 'undefined' ? null : navigator);
const isAbort = (e: unknown) => e instanceof DOMException && e.name === 'AbortError';

/** Triggers a browser download of a Blob (also the Android path to "open with Calendar"). */
export function downloadBlob(name: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function pickViaInput(o: { accept?: string; capture?: string; multiple?: boolean }): Promise<File[]> {
  return new Promise((resolve) => {
    const i = document.createElement('input');
    i.type = 'file';
    if (o.accept) i.accept = o.accept;
    if (o.capture) i.setAttribute('capture', o.capture);
    i.multiple = Boolean(o.multiple);
    i.onchange = () => resolve(Array.from(i.files ?? []));
    i.addEventListener('cancel', () => resolve([]));
    i.click();
  });
}

async function downscaleImage(file: File): Promise<{ dataUrl: string; width: number; height: number; mime: string }> {
  const bmp = await createImageBitmap(file);
  const plan = planDownscale(bmp.width, bmp.height, MAX_IMAGE_EDGE);
  const canvas = document.createElement('canvas');
  canvas.width = plan.width;
  canvas.height = plan.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new TypeError('canvas unavailable');
  ctx.drawImage(bmp, 0, 0, plan.width, plan.height);
  bmp.close?.();
  return { dataUrl: canvas.toDataURL('image/jpeg', JPEG_QUALITY), width: plan.width, height: plan.height, mime: 'image/jpeg' };
}

const calendar: CalendarAdapter = {
  async addEvent(ev, mode = 'auto') {
    try {
      if (mode === 'google') {
        window.open(googleCalendarUrl(ev), '_blank', 'noopener');
        return { status: 'opened', via: 'web' };
      }
      const file = new File([buildIcs(ev)], icsFileName(ev.title), { type: 'text/calendar' });
      if (mode === 'share' && nav()?.canShare?.({ files: [file] })) {
        try {
          await nav().share({ files: [file], title: ev.title });
          return { status: 'shared', via: 'web' };
        } catch (e) {
          if (isAbort(e)) return { status: 'cancelled', via: 'web' };
        }
      }
      downloadBlob(file.name, file);
      return { status: 'downloaded', via: 'web' };
    } catch (e) {
      return { status: 'failed', via: 'web', message: e instanceof Error ? e.message : 'Could not create the event' };
    }
  },
};

export function normalizeContacts(raw: unknown): PickedContact[] {
  if (!Array.isArray(raw)) return [];
  const strs = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((x) => x.trim()) : []);
  return raw
    .map((r: any) => ({ name: strs(r?.name)[0] ?? '', emails: strs(r?.email), phones: strs(r?.tel) }))
    .filter((c) => c.name || c.emails.length || c.phones.length);
}

const contacts: ContactsAdapter = {
  isSupported: () => Boolean(nav()?.contacts?.select),
  async pick(opts) {
    if (!nav()?.contacts?.select) return { status: 'unsupported', via: 'web' };
    try {
      const raw = await nav().contacts.select(['name', 'email', 'tel'], { multiple: Boolean(opts?.multiple) });
      const list = normalizeContacts(raw);
      return list.length ? { status: 'ok', contacts: list, via: 'web' } : { status: 'cancelled', via: 'web' };
    } catch (e) {
      return isAbort(e) ? { status: 'cancelled', via: 'web' } : { status: 'error', via: 'web', message: e instanceof Error ? e.message : 'Contact picker failed' };
    }
  },
};

const location: LocationAdapter = {
  isSupported: () => Boolean(nav()?.geolocation),
  current(opts) {
    return new Promise((resolve) => {
      if (!nav()?.geolocation) {
        resolve({ status: 'error', kind: 'unsupported', message: locationErrorMessage('unsupported'), via: 'web' });
        return;
      }
      nav().geolocation.getCurrentPosition(
        (pos: GeolocationPosition) => {
          const place = buildPlace(pos.coords);
          resolve(place ? { status: 'ok', place, via: 'web' } : { status: 'error', kind: 'unavailable', message: locationErrorMessage('unavailable'), via: 'web' });
        },
        (err: GeolocationPositionError) => {
          const kind = mapGeoError(err.code);
          resolve({ status: 'error', kind, message: locationErrorMessage(kind), via: 'web' });
        },
        { enableHighAccuracy: Boolean(opts?.highAccuracy), timeout: opts?.timeoutMs ?? LOCATION_TIMEOUT_MS, maximumAge: 0 },
      );
    });
  },
  async permission() {
    try {
      const s = await nav()?.permissions?.query({ name: 'geolocation' });
      return s?.state ?? null;
    } catch {
      return null;
    }
  },
};

const camera: CameraAdapter = {
  async capture(kind) {
    if (!hasWindow()) return { status: 'error', kind: 'unsupported', message: cameraErrorMessage('unsupported'), via: 'web' };
    try {
      // The capture attribute opens the system camera app on Android; always works, no getUserMedia permission.
      const [file] = await pickViaInput({ accept: kind === 'image' ? 'image/*' : 'video/*', capture: 'environment' });
      if (!file) return { status: 'cancelled', via: 'web' };
      if (kind === 'video') return { status: 'ok', file, via: 'web' };
      const img = await downscaleImage(file);
      return { status: 'ok', image: { ...img, name: file.name }, via: 'web' };
    } catch (e) {
      const k = mapCameraError(e);
      return { status: 'error', kind: k, message: cameraErrorMessage(k), via: 'web' };
    }
  },
};

const files: FilesAdapter = {
  async pick(opts) {
    if (!hasWindow()) return [];
    const w = window as any;
    if (typeof w.showOpenFilePicker === 'function' && !nav()?.userAgent?.includes('Android')) {
      try {
        const handles = await w.showOpenFilePicker({ multiple: Boolean(opts?.multiple) });
        return await Promise.all(handles.map((h: any) => h.getFile()));
      } catch {
        return [];
      }
    }
    // Android's document picker (which also exposes Drive) backs <input type=file>.
    return pickViaInput({ accept: opts?.accept, multiple: opts?.multiple });
  },
  async save(file) {
    if (!hasWindow()) return { status: 'error', via: 'web', message: 'No window' };
    const blob = file.data instanceof Blob ? file.data : new Blob([file.data], { type: file.mime });
    const w = window as any;
    try {
      if (typeof w.showSaveFilePicker === 'function') {
        const h = await w.showSaveFilePicker({ suggestedName: file.name });
        const ws = await h.createWritable();
        await ws.write(blob);
        await ws.close();
        return { status: 'saved', via: 'web' };
      }
      downloadBlob(file.name, blob);
      return { status: 'downloaded', via: 'web' };
    } catch (e) {
      if (isAbort(e)) return { status: 'cancelled', via: 'web' };
      return { status: 'error', via: 'web', message: e instanceof Error ? e.message : 'Save failed' };
    }
  },
};

const apps: AppsAdapter = {
  async open(l) {
    if (!hasWindow()) return { status: 'fallback', via: 'web' };
    // Intent URLs carry their own browser_fallback_url; other URLs are plain navigations.
    if (l.url.startsWith('intent:')) {
      window.location.href = l.url;
      return { status: 'launched', via: 'web' };
    }
    window.open(l.url, '_blank', 'noopener');
    return { status: 'launched', via: 'web' };
  },
  async isInstalled() {
    return null; // a PWA cannot know
  },
};

const share: ShareAdapter = {
  async share(input) {
    const data = buildShareData(input);
    const n = nav();
    try {
      if (n?.share && (data || input.files?.length)) {
        const payload: any = { ...(data ?? {}) };
        if (input.files?.length && n.canShare?.({ files: input.files })) payload.files = input.files;
        if (!n.canShare || n.canShare(payload)) {
          await n.share(payload);
          return 'shared';
        }
      }
    } catch (e) {
      if (isAbort(e)) return 'cancelled';
    }
    try {
      await n.clipboard.writeText(composeShareText(input));
      return 'copied';
    } catch {
      return 'failed';
    }
  },
};

const mapPerm = (p: string | undefined): NotifyPermission => (p === 'granted' || p === 'denied' || p === 'default' ? p : 'unsupported');

const notifications: NotificationsAdapter = {
  async permission() {
    return typeof Notification === 'undefined' ? 'unsupported' : mapPerm(Notification.permission);
  },
  async request() {
    if (typeof Notification === 'undefined') return 'unsupported';
    try {
      return mapPerm(await Notification.requestPermission());
    } catch {
      return mapPerm(Notification.permission);
    }
  },
  async notify(title, body) {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return false;
    try {
      const reg = await nav()?.serviceWorker?.getRegistration?.();
      if (reg) await reg.showNotification(title, { body, icon: '/icons/icon-192.png' });
      else new Notification(title, { body });
      return true;
    } catch {
      return false;
    }
  },
};

export function createWebAdapter(): NativeAdapter {
  return { impl: 'web', calendar, contacts, location, camera, files, apps, share, notifications };
}
