'use client';

import { useCallback, useEffect, useState } from 'react';
import { M3Card, M3State } from '@/components/ui/m3';
import { UI_API } from '@/lib/api/endpoints';
import { platformPasskeySupported, registerThisDevice } from '@/lib/passkey-client';

type Device = { id: string; deviceName: string; createdAt: string; lastUsedAt: string | null };

function fmt(iso: string | null): string {
  if (!iso) return 'never';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? 'unknown' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function PasskeyCard() {
  const [devices, setDevices] = useState<Device[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch(UI_API.passkeyList, { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Could not load your devices. Try again.');
      setDevices(data.devices as Device[]);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Could not load your devices. Try again.');
    }
  }, []);

  useEffect(() => {
    load();
    platformPasskeySupported().then(setSupported);
  }, [load]);

  async function add() {
    setBusy(true);
    setError(null);
    setStatus('Waiting for Face ID or fingerprint');
    try {
      await registerThisDevice(name);
      setName('');
      setStatus('Device added');
      await load();
    } catch (e) {
      setStatus('');
      setError(e instanceof Error ? e.message : 'Could not add this device');
    } finally {
      setBusy(false);
    }
  }

  async function remove(d: Device) {
    if (!window.confirm(`Remove ${d.deviceName}? It will no longer be able to sign in with biometrics.`)) return;
    setRemoving(d.id);
    setError(null);
    setStatus(`Removing ${d.deviceName}`);
    try {
      const res = await fetch(UI_API.passkeyDelete, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: d.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Could not remove device');
      setStatus(`${d.deviceName} removed`);
      await load();
    } catch (e) {
      setStatus('');
      setError(e instanceof Error ? e.message : 'Could not remove device');
    } finally {
      setRemoving(null);
    }
  }

  return (
    <M3Card title="Biometric sign-in">
      <p className="text-sm text-text-secondary">
        Sign in with Face ID, fingerprint or Windows Hello on devices you add here.
      </p>

      {devices === null ? (
        loadError ? (
          <div className="space-y-2">
            <M3State state="error" message={loadError} />
            <button
              type="button"
              onClick={load}
              className="min-h-11 px-4 rounded-xl border border-border-primary text-sm font-bold text-text-primary"
            >
              Try again
            </button>
          </div>
        ) : (
          <M3State state="loading" message="Loading devices…" />
        )
      ) : devices.length === 0 ? (
        <p className="text-sm text-text-tertiary">No devices added yet.</p>
      ) : (
        <ul className="divide-y divide-border-secondary">
          {devices.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{d.deviceName}</p>
                <p className="text-2xs text-text-tertiary">
                  Added {fmt(d.createdAt)}, last used {fmt(d.lastUsedAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => remove(d)}
                disabled={removing === d.id}
                aria-label={`Remove ${d.deviceName}`}
                className="min-h-11 shrink-0 px-4 rounded-xl border border-border-primary text-sm font-bold text-danger disabled:opacity-50"
              >
                {removing === d.id ? 'Removing…' : 'Remove'}
              </button>
            </li>
          ))}
        </ul>
      )}

      {supported === false ? (
        <p className="text-sm text-text-tertiary">This browser or device does not support biometric sign-in.</p>
      ) : (
        <div className="space-y-2">
          <label htmlFor="passkey-device-name" className="block text-xs font-bold text-text-secondary">
            Device name
          </label>
          <input
            id="passkey-device-name"
            type="text"
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="For example, My phone"
            className="w-full min-h-11 rounded-2xl border border-border-primary bg-bg-primary p-3 text-md text-text-primary placeholder:text-text-tertiary"
          />
          <button
            type="button"
            onClick={add}
            disabled={busy || supported === null}
            className="w-full min-h-11 py-3 rounded-2xl bg-text-primary text-bg-primary text-sm font-bold disabled:opacity-40"
          >
            {busy ? 'Waiting for your device…' : 'Add this device'}
          </button>
        </div>
      )}

      <p role="status" aria-live="polite" className="text-sm text-success empty:hidden">{status}</p>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </M3Card>
  );
}
