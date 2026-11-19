'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { CalendarPlus, Camera, ClipboardPaste, Contact, MapPin, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { captureToBuffer } from '@/lib/pwa/capture-client';
import { getNative, readClipboard } from '@/lib/native';
import { buildShareCaptureBody } from '@/lib/native/share-data';
import { buildImageCaptureBody } from '@/lib/native/camera';
import { formatPlace, permissionLabel, attachPlaceToBody, type Place } from '@/lib/native/location';
import { geoUrl } from '@/lib/native/deep-links';
import { storageErrorMessage, mapStorageError } from '@/lib/native/storage';
import type { IcsEvent } from '@/lib/native/ics';
import type { PickedContact } from '@/lib/native/adapter';

type Status = { tone: 'ok' | 'err'; message: string } | null;

function StatusLine({ status }: { status: Status }) {
  if (!status) return null;
  return (
    <p role={status.tone === 'ok' ? 'status' : 'alert'} aria-live="polite" className={`text-2xs ${status.tone === 'ok' ? 'text-success' : 'text-danger'}`}>
      {status.message}
    </p>
  );
}

/** Queue-aware capture: works offline, and reports a full device instead of throwing. */
async function capture(body: Record<string, unknown>): Promise<Status> {
  try {
    const out = await captureToBuffer({ body });
    if (out.kind === 'rejected') return { tone: 'err', message: 'The buffer rejected this capture.' };
    return { tone: 'ok', message: out.kind === 'queued' ? 'Saved offline. It will sync when you are back online.' : 'Saved to the buffer.' };
  } catch (e) {
    return { tone: 'err', message: storageErrorMessage(mapStorageError(e)) };
  }
}

export interface ShareButtonProps {
  title?: string;
  text?: string;
  url?: string;
  label?: string;
}

export function ShareButton({ title, text, url, label = 'Share' }: ShareButtonProps) {
  const [status, setStatus] = useState<Status>(null);
  return (
    <div className="space-y-1">
      <Button
        variant="outline"
        size="lg"
        onClick={async () => {
          const r = await getNative().share.share({ title, text, url: url ?? (typeof location !== 'undefined' ? location.href : undefined) });
          if (r === 'copied') setStatus({ tone: 'ok', message: 'Copied to the clipboard.' });
          else if (r === 'failed') setStatus({ tone: 'err', message: 'Sharing is not available here.' });
          else setStatus(null);
        }}
      >
        <Share2 className="h-4 w-4" aria-hidden="true" />
        {label}
      </Button>
      <StatusLine status={status} />
    </div>
  );
}

function toLocalInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export interface AddToCalendarProps {
  title?: string;
  description?: string;
  location?: string;
  url?: string;
}

/** Small form: title, start, length, reminder. Opens the .ics in the Calendar app (or the native editor in the shell). */
export function AddToCalendarButton({ title = '', description, location, url }: AddToCalendarProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(title);
  const [start, setStart] = useState(() => toLocalInput(new Date(Date.now() + 60 * 60 * 1000)));
  const [minutes, setMinutes] = useState(60);
  const [alarm, setAlarm] = useState(15);
  const [status, setStatus] = useState<Status>(null);

  async function add(mode: 'auto' | 'share' | 'google') {
    const startDate = new Date(start);
    if (!name.trim() || Number.isNaN(startDate.getTime())) {
      setStatus({ tone: 'err', message: 'Add a title and a start time.' });
      return;
    }
    const ev: IcsEvent = {
      title: name, start: startDate, end: new Date(startDate.getTime() + minutes * 60_000),
      description, location, url, alarmMinutes: alarm > 0 ? alarm : undefined,
    };
    const r = await getNative().calendar.addEvent(ev, mode);
    if (r.status === 'failed') setStatus({ tone: 'err', message: r.message });
    else if (r.status === 'cancelled') setStatus(null);
    else if (r.status === 'downloaded') setStatus({ tone: 'ok', message: 'Event file saved. Open it from your notifications or Downloads to add it to Calendar.' });
    else setStatus({ tone: 'ok', message: 'Event ready.' });
  }

  return (
    <div className="space-y-2">
      <Button variant="outline" size="lg" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <CalendarPlus className="h-4 w-4" aria-hidden="true" />
        Add to calendar
      </Button>
      {open && (
        <div className="space-y-2 rounded-xl border border-border-primary p-3">
          <label className="block text-2xs text-text-tertiary">
            Title
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block min-h-11 w-full rounded-xl border border-border-primary bg-bg-elevated px-3 text-sm text-text-primary" />
          </label>
          <label className="block text-2xs text-text-tertiary">
            Starts
            <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className="mt-1 block min-h-11 w-full rounded-xl border border-border-primary bg-bg-elevated px-3 text-sm text-text-primary" />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-2xs text-text-tertiary">
              Length
              <select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className="mt-1 block min-h-11 w-full rounded-xl border border-border-primary bg-bg-elevated px-3 text-sm text-text-primary">
                {[15, 30, 60, 90, 120].map((m) => <option key={m} value={m}>{m} minutes</option>)}
              </select>
            </label>
            <label className="block text-2xs text-text-tertiary">
              Reminder
              <select value={alarm} onChange={(e) => setAlarm(Number(e.target.value))} className="mt-1 block min-h-11 w-full rounded-xl border border-border-primary bg-bg-elevated px-3 text-sm text-text-primary">
                <option value={0}>None</option>
                {[5, 15, 30, 60].map((m) => <option key={m} value={m}>{m} minutes before</option>)}
              </select>
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="lg" onClick={() => add('auto')}>Add to calendar</Button>
            <Button size="lg" variant="outline" onClick={() => add('share')}>Share file</Button>
            <Button size="lg" variant="outline" onClick={() => add('google')}>Google Calendar</Button>
          </div>
        </div>
      )}
      <StatusLine status={status} />
    </div>
  );
}

export function PickContactButton({ onPick }: { onPick?: (c: PickedContact[]) => void }) {
  const [status, setStatus] = useState<Status>(null);
  const [picked, setPicked] = useState<PickedContact[]>([]);
  const supported = getNative().contacts.isSupported();
  return (
    <div className="space-y-1">
      <Button
        variant="outline"
        size="lg"
        disabled={!supported}
        onClick={async () => {
          const r = await getNative().contacts.pick({ multiple: true });
          if (r.status === 'ok') {
            setPicked(r.contacts);
            onPick?.(r.contacts);
            setStatus(null);
          } else if (r.status === 'error') setStatus({ tone: 'err', message: r.message });
        }}
      >
        <Contact className="h-4 w-4" aria-hidden="true" />
        Pick contact
      </Button>
      {!supported && <p className="text-2xs text-text-tertiary">The contact picker is available in Chrome on Android.</p>}
      {picked.length > 0 && (
        <ul className="text-2xs text-text-secondary">
          {picked.map((c, i) => <li key={`${c.name}-${i}`}>{c.name || 'Unnamed'}{c.emails[0] ? `, ${c.emails[0]}` : ''}{c.phones[0] ? `, ${c.phones[0]}` : ''}</li>)}
        </ul>
      )}
      <StatusLine status={status} />
    </div>
  );
}

/** One-tap location fix with permission state, Open in Maps and Share location. Never runs in the background. */
export function AttachLocationButton({ onPlace }: { onPlace?: (p: Place) => void }) {
  const [place, setPlace] = useState<Place | null>(null);
  const [busy, setBusy] = useState(false);
  const [precise, setPrecise] = useState(false);
  const [perm, setPerm] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>(null);
  const native = getNative();

  useEffect(() => {
    let live = true;
    native.location.permission().then((s) => live && setPerm(s));
    return () => { live = false; };
  }, [native, place]);

  async function run() {
    setBusy(true);
    setStatus(null);
    const r = await native.location.current({ highAccuracy: precise });
    setBusy(false);
    if (r.status === 'ok') {
      setPlace(r.place);
      onPlace?.(r.place);
    } else setStatus({ tone: 'err', message: r.message });
  }

  return (
    <div className="space-y-2">
      <Button variant="outline" size="lg" loading={busy} loadingLabel="Getting location" onClick={run} disabled={!native.location.isSupported()}>
        <MapPin className="h-4 w-4" aria-hidden="true" />
        Attach location
      </Button>
      <label className="flex min-h-11 items-center gap-2 text-2xs text-text-tertiary">
        <input type="checkbox" checked={precise} onChange={(e) => setPrecise(e.target.checked)} className="h-4 w-4" />
        High accuracy (slower, uses more battery)
      </label>
      <p className="text-2xs text-text-tertiary">Location permission: {permissionLabel(perm)}. One fix on tap, never in the background.</p>
      {place && (
        <div className="space-y-2 rounded-xl border border-border-primary p-3">
          <p className="text-sm text-text-primary">{formatPlace(place)}</p>
          <div className="flex flex-wrap gap-2">
            <Button size="lg" variant="outline" onClick={() => native.apps.open({ url: geoUrl(place.lat, place.lon) ?? place.mapsUrl, fallbackUrl: place.mapsUrl })}>Open in Maps</Button>
            <Button size="lg" variant="outline" onClick={() => native.share.share({ title: 'My location', text: formatPlace(place), url: place.mapsUrl })}>Share my location</Button>
          </div>
        </div>
      )}
      <StatusLine status={status} />
    </div>
  );
}

/** Photo capture into the buffer. System camera app first; downscaled before upload. */
export function CameraCaptureButton({ kind = 'image' }: { kind?: 'image' | 'video' }) {
  const [status, setStatus] = useState<Status>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-1">
      <Button
        variant="outline"
        size="lg"
        loading={busy}
        loadingLabel="Processing"
        onClick={async () => {
          setBusy(true);
          const r = await getNative().camera.capture(kind);
          if (r.status === 'ok' && r.image) setStatus(await capture(buildImageCaptureBody(r.image)));
          else if (r.status === 'ok') setStatus({ tone: 'err', message: 'Video capture is not stored yet. Use a photo.' });
          else if (r.status === 'error') setStatus({ tone: 'err', message: r.message });
          else setStatus(null);
          setBusy(false);
        }}
      >
        <Camera className="h-4 w-4" aria-hidden="true" />
        {kind === 'image' ? 'Take photo' : 'Record video'}
      </Button>
      <StatusLine status={status} />
    </div>
  );
}

/** Return path for answers from other apps: reads the clipboard only on tap and captures it. */
export function PasteCaptureButton() {
  const [status, setStatus] = useState<Status>(null);
  return (
    <div className="space-y-1">
      <Button
        variant="outline"
        size="lg"
        onClick={async () => {
          const r = await readClipboard();
          if (r.status === 'ok') setStatus(await capture(buildShareCaptureBody({ title: '', text: r.text.slice(0, 20_000), url: null })));
          else if (r.status === 'empty') setStatus({ tone: 'err', message: 'The clipboard is empty.' });
          else if (r.status === 'denied') setStatus({ tone: 'err', message: 'Clipboard access was denied.' });
          else setStatus({ tone: 'err', message: 'Clipboard reading is not available here.' });
        }}
      >
        <ClipboardPaste className="h-4 w-4" aria-hidden="true" />
        Paste from clipboard
      </Button>
      <StatusLine status={status} />
    </div>
  );
}

/** Row of device actions. Mount on the capture page and next to memory/content item actions. */
export function DeviceActionsRow({
  title, text, url, extra, onPlace, onContacts,
}: ShareButtonProps & { extra?: ReactNode; onPlace?: (p: Place) => void; onContacts?: (c: PickedContact[]) => void }) {
  return (
    <section aria-label="Device actions" className="flex flex-wrap items-start gap-2">
      <ShareButton title={title} text={text} url={url} />
      <AddToCalendarButton title={title} description={text} url={url} />
      <PickContactButton onPick={onContacts} />
      <AttachLocationButton onPlace={onPlace} />
      {extra}
    </section>
  );
}

export { attachPlaceToBody };
