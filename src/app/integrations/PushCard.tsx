'use client';

import { useCallback, useEffect, useState } from 'react';
import { M3Button, M3Card } from '@/components/ui/m3';
import { apiRequest } from '@/lib/ui/api-client';
import { currentSubscription, disablePush, enablePush, pushSupport, type PushSupport } from '@/lib/push/client';

type Config = { configured: boolean; publicKey: string | null };

const PERMISSION_TEXT: Record<PushSupport, string> = {
  unsupported: 'This browser does not support notifications.',
  denied: 'Notifications are blocked for this site. Allow them in your browser settings to turn them on.',
  default: 'Not asked yet on this device.',
  granted: 'Allowed on this device.',
};

/** Owner setting: push notifications on this device. Mount on the integrations page. */
export function PushCard() {
  const [config, setConfig] = useState<Config | null>(null);
  const [support, setSupport] = useState<PushSupport>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConfig = useCallback(() => {
    setError(null);
    return apiRequest<Config>('/api/push/subscribe')
      .then((c) => setConfig(c))
      .catch(() => setError('Could not check notification setup. Check your connection and try again.'));
  }, []);

  useEffect(() => {
    let live = true;
    setSupport(pushSupport());
    currentSubscription()
      .then((s) => { if (live) setSubscribed(!!s); })
      .catch(() => {});
    loadConfig();
    return () => { live = false; };
  }, [loadConfig]);

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      if (subscribed) {
        await disablePush();
        setSubscribed(false);
      } else if (config?.publicKey) {
        await enablePush(config.publicKey);
        setSubscribed(true);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    } finally {
      setSupport(pushSupport());
      setBusy(false);
    }
  }

  const notConfigured = config !== null && !config.configured;
  const blocked = support === 'unsupported' || (support === 'denied' && !subscribed);

  return (
    <M3Card title="Notifications on this device">
      <p className="-mt-1 text-xs text-text-tertiary">Get a notification when something needs your attention.</p>
      {notConfigured ? (
        <p className="text-sm text-text-secondary">Notifications are not set up on the server yet, so they cannot be turned on.</p>
      ) : (
        <>
          <p className="text-sm text-text-secondary">
            {subscribed ? 'On for this device.' : 'Off for this device.'} {PERMISSION_TEXT[support]}
          </p>
          <M3Button
            type="button"
            onClick={toggle}
            disabled={busy || blocked || config === null}
          >
            {subscribed ? 'Turn off' : 'Turn on'}
          </M3Button>
        </>
      )}
      {error ? <p role="alert" className="text-xs text-danger">{error}</p> : null}
      {error && config === null ? <M3Button tone="secondary" onClick={loadConfig}>Try again</M3Button> : null}
    </M3Card>
  );
}
