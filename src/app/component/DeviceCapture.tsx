'use client';

import { useState } from 'react';
import { MapPin, Clipboard, Bell } from 'lucide-react';
import { apiRequest } from '@/lib/ui/api-client';

type Status = { kind: string; message: string; tone: 'ok' | 'err' } | null;

/**
 * Device capture surface — real browser permission prompts writing
 * `source=device` blobs. Every action is user-initiated; nothing runs
 * automatically or in the background.
 */
export function DeviceCapture() {
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>(null);

  async function send(kind: string, data: Record<string, unknown>) {
    await apiRequest('/api/ingest/device', { method: 'POST', body: { kind, data } });
  }

  async function captureLocation() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus({ kind: 'geolocation', message: 'Geolocation not available in this browser.', tone: 'err' });
      return;
    }
    setBusy('geolocation');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await send('geolocation', {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            capturedAt: new Date().toISOString(),
          });
          setStatus({ kind: 'geolocation', message: 'Location captured to the buffer.', tone: 'ok' });
        } catch (e) {
          setStatus({ kind: 'geolocation', message: e instanceof Error ? e.message : 'Capture failed.', tone: 'err' });
        } finally {
          setBusy(null);
        }
      },
      (err) => {
        setBusy(null);
        setStatus({ kind: 'geolocation', message: `Permission denied or unavailable (${err.message}).`, tone: 'err' });
      },
      { enableHighAccuracy: false, timeout: 10_000 },
    );
  }

  async function captureClipboard() {
    setBusy('clipboard');
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard?.readText) {
        throw new Error('Clipboard read not available in this browser.');
      }
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        setStatus({ kind: 'clipboard', message: 'Clipboard is empty — nothing captured.', tone: 'err' });
        return;
      }
      await send('clipboard', { text, capturedAt: new Date().toISOString() });
      setStatus({ kind: 'clipboard', message: `Captured ${text.length} characters to the buffer.`, tone: 'ok' });
    } catch (e) {
      setStatus({ kind: 'clipboard', message: e instanceof Error ? e.message : 'Clipboard permission denied.', tone: 'err' });
    } finally {
      setBusy(null);
    }
  }

  async function enableNotifications() {
    setBusy('notification');
    try {
      if (typeof Notification === 'undefined') {
        throw new Error('Notifications not supported in this browser.');
      }
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus({ kind: 'notification', message: `Notifications ${permission}.`, tone: 'err' });
        return;
      }
      await send('notification', { permission, capturedAt: new Date().toISOString() });
      new Notification('Identity Prism', { body: 'Notifications enabled.' });
      setStatus({ kind: 'notification', message: 'Notifications enabled and logged.', tone: 'ok' });
    } catch (e) {
      setStatus({ kind: 'notification', message: e instanceof Error ? e.message : 'Failed to enable notifications.', tone: 'err' });
    } finally {
      setBusy(null);
    }
  }

  const actions = [
    { kind: 'geolocation', icon: MapPin, label: 'Capture location', hint: 'One-time GPS fix for location context.', run: captureLocation },
    { kind: 'clipboard', icon: Clipboard, label: 'Capture clipboard', hint: 'Reads the clipboard once, on click.', run: captureClipboard },
    { kind: 'notification', icon: Bell, label: 'Enable notifications', hint: 'Opt in to browser notifications.', run: enableNotifications },
  ] as const;

  return (
    <div className="space-y-2">
      <p className="text-2xs text-text-tertiary">
        Each action prompts for a browser permission and writes a device signal to the buffer. Nothing is captured in the background.
      </p>
      {actions.map((a) => {
        const Icon = a.icon;
        return (
          <button
            key={a.kind}
            onClick={a.run}
            disabled={busy !== null}
            className="w-full flex items-center gap-3 rounded-xl border border-border-primary p-3 text-left hover:bg-bg-secondary disabled:opacity-50"
          >
            <Icon className="h-4 w-4 text-accent shrink-0" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-text-primary">{busy === a.kind ? 'Requesting…' : a.label}</span>
              <span className="block text-2xs text-text-tertiary">{a.hint}</span>
            </span>
          </button>
        );
      })}
      {status && (
        <p className={`text-2xs ${status.tone === 'ok' ? 'text-success' : 'text-danger'}`}>{status.message}</p>
      )}
    </div>
  );
}
