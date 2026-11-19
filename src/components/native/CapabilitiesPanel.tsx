'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { detectCapabilities, NO_CAPABILITIES, type Capabilities } from '@/lib/native/capabilities';
import { CAPABILITY_TABLE, IMPOSSIBLE_FROM_PWA } from '@/lib/native/capability-table';
import { describeBattery, describeNetwork, speakableText } from '@/lib/native/device-helpers';
import { haptic, setAppBadge } from '@/lib/pwa/browser';
import { getNative } from '@/lib/native/adapter';
import { holdWakeLock, registerPrismProtocol, scanNfcOnce, speak, takeScreenshotFrame, writeClipboard, readClipboard, type WakeLockHandle } from '@/lib/native/browser';


/** Lists what this device supports (detected live) with a safe "Try" button where one makes sense. Mount on the system page. */
export function CapabilitiesPanel() {
  const [caps, setCaps] = useState<Capabilities>(NO_CAPABILITIES);
  const [ready, setReady] = useState(false);
  const [results, setResults] = useState<Record<string, string>>({});
  const [wake, setWake] = useState<WakeLockHandle | null>(null);

  useEffect(() => {
    setCaps(detectCapabilities());
    setReady(true);
  }, []);

  const say = (k: string, v: string) => setResults((r) => ({ ...r, [k]: v }));
  const native = getNative();

  const actions: Record<string, () => Promise<void> | void> = {
    share: async () => say('share', await native.share.share({ title: 'Identity Prism OS', url: location.origin })),
    copy: async () => say('copy', (await writeClipboard('Identity Prism OS')) ? 'Copied' : 'Failed'),
    paste: async () => { const r = await readClipboard(); say('paste', r.status === 'ok' ? `Read ${r.text.length} characters` : r.status); },
    contacts: async () => { const r = await native.contacts.pick(); say('contacts', r.status === 'ok' ? `Picked ${r.contacts.length}` : r.status); },
    location: async () => { const r = await native.location.current(); say('location', r.status === 'ok' ? `Fix within ${r.place.accuracy ?? '?'} m` : r.message); },
    camera: async () => { const r = await native.camera.capture('image'); say('camera', r.status === 'ok' ? 'Photo taken (not saved)' : r.status === 'error' ? r.message : r.status); },
    wakelock: async () => {
      if (wake) { await wake.release(); setWake(null); say('wakelock', 'Released'); return; }
      const h = await holdWakeLock();
      setWake(h);
      say('wakelock', h ? 'Screen will stay on until you tap again' : 'Refused');
    },
    vibrate: () => { haptic('success'); say('vibrate', 'Sent'); },
    badge: () => { setAppBadge(1); say('badge', 'Badge set to 1 (clears on next sync)'); setTimeout(() => setAppBadge(0), 5000); },
    notify: async () => {
      const p = await native.notifications.request();
      say('notify', p === 'granted' ? ((await native.notifications.notify('Identity Prism OS', 'Test notification')) ? 'Sent' : 'Failed') : p);
    },
    speak: () => say('speak', speak(speakableText('Identity Prism OS is listening.')) ? 'Speaking' : 'Failed'),
    nfc: async () => { say('nfc', 'Hold a tag to the back of the phone'); const r = await scanNfcOnce(); say('nfc', r ? (r.join(' | ') || 'Empty tag') : 'Nothing read'); },
    screenshot: async () => say('screenshot', (await takeScreenshotFrame()) ? 'Captured (not saved)' : 'Not available'),
    network: () => {
      const d = describeNetwork(navigator.onLine, (navigator as any).connection);
      say('network', d.label);
    },
    battery: async () => { try { const b = await (navigator as any).getBattery(); say('battery', describeBattery(b)); } catch { say('battery', 'Not reported'); } },
    fullscreen: async () => { try { await document.documentElement.requestFullscreen(); say('fullscreen', 'Fullscreen'); } catch { say('fullscreen', 'Refused'); } },
    protocol: () => say('protocol', registerPrismProtocol() ? 'Registered web+prism' : 'Not supported'),
    'sync-status': async () => {
      const reg: any = await navigator.serviceWorker?.getRegistration?.();
      const tags = (await reg?.sync?.getTags?.()) ?? [];
      say('sync-status', tags.length ? `Pending: ${tags.join(', ')}` : 'Nothing pending');
    },
  };

  return (
    <section aria-label="Device capabilities" className="space-y-3">
      <p className="text-2xs text-text-tertiary">
        Detected on this device{caps.android ? ' (Android)' : ''}{caps.standalone ? ', running as an installed app' : ''}. Support levels are for Chrome on Android.
      </p>
      <ul className="divide-y divide-border-secondary rounded-xl border border-border-primary">
        {CAPABILITY_TABLE.map((row) => {
          const here = caps[row.key];
          const act = row.tryAction ? actions[row.tryAction] : undefined;
          return (
            <li key={row.key} className="flex flex-wrap items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-text-primary">{row.label}</p>
                <p className="text-2xs text-text-tertiary">{row.level}. {row.note}</p>
                {results[row.tryAction ?? ''] && <p role="status" aria-live="polite" className="text-2xs text-text-secondary">{results[row.tryAction ?? '']}</p>}
              </div>
              <span className={`text-2xs ${ready && here ? 'text-success' : 'text-text-tertiary'}`}>{!ready ? 'Checking' : here ? 'Available' : 'Not available'}</span>
              {act && (
                <Button variant="outline" size="sm" disabled={!here} onClick={() => void act()} aria-label={`Try ${row.label}`}>
                  Try
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      <div className="space-y-1 rounded-xl border border-border-primary p-3">
        <p className="text-sm font-bold text-text-primary">Not possible from a web app</p>
        <ul className="list-disc space-y-1 pl-5 text-2xs text-text-secondary">
          {IMPOSSIBLE_FROM_PWA.map((i) => <li key={i.what}>{i.what}. Needs: {i.shell}</li>)}
        </ul>
      </div>
    </section>
  );
}
