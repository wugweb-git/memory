'use client';

import { useCallback, useEffect, useState } from 'react';
import { M3Button } from '@/components/ui/m3';
import { apiRequest } from '@/lib/ui/api-client';
import { currentSubscription, disablePush, enablePush, pushSupport, type PushSupport } from '@/lib/push/client';
import { Card, Section } from '@/components/ui/primitives';

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
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

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

  async function sendTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const r = await apiRequest<{ message?: string }>('/api/push/test', { method: 'POST', body: {}, retries: 0 });
      setTestResult(r.message ?? 'Test notification sent.');
    } catch (e: unknown) {
      setTestResult(e instanceof Error ? e.message : 'Could not send a test notification. Try again.');
    } finally {
      setTesting(false);
    }
  }

  const notConfigured = config !== null && !config.configured;
  const blocked = support === 'unsupported' || (support === 'denied' && !subscribed);

  return (
    <Section title="Notifications on this device" description="Get a notification when something needs your attention.">
<Card className="space-y-3">
      {notConfigured ? (
        <p className="text-sm text-text-secondary">Notifications are not set up on the server yet, so they cannot be turned on.</p>
      ) : (
        <div className="flex items-center gap-3">
          <p className="min-w-0 flex-1 text-sm text-text-secondary">
            <span className="block text-base font-medium text-text-primary">{subscribed ? 'On for this device' : 'Off for this device'}</span>
            {PERMISSION_TEXT[support]}
          </p>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <M3Button
              type="button"
              onClick={toggle}
              disabled={busy || blocked || config === null}
            >
              {subscribed ? 'Turn off' : 'Turn on'}
            </M3Button>
            {subscribed ? (
              <M3Button type="button" tone="secondary" onClick={sendTest} disabled={testing || busy}>
                {testing ? 'Sending...' : 'Send a test notification'}
              </M3Button>
            ) : null}
          </div>
        </div>
      )}
      {testResult ? <p aria-live="polite" className="text-xs text-text-secondary">{testResult}</p> : null}
      {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
      {error && config === null ? <M3Button tone="secondary" onClick={loadConfig}>Try again</M3Button> : null}
    </Card>
</Section>
  );
}
