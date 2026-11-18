'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Download, X } from 'lucide-react';
import {
  INSTALL_DISMISS_KEY,
  detectInstallPlatform,
  isInstallDismissed,
  isIosSafari,
  isPrivatePath,
  type InstallPlatform,
} from '@/lib/pwa/helpers';
import { haptic, isStandalone } from '@/lib/pwa/browser';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function readDismissed(): string | null {
  try {
    return localStorage.getItem(INSTALL_DISMISS_KEY);
  } catch {
    return null;
  }
}

/**
 * Install prompt for private pages only. Android/Chromium uses beforeinstallprompt;
 * iOS Safari gets Add to Home Screen steps. Dismissal is remembered for two weeks.
 */
export function InstallPrompt() {
  const pathname = usePathname();
  const [platform, setPlatform] = useState<InstallPlatform>('other');
  const [iosSafari, setIosSafari] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (isStandalone() || isInstallDismissed(readDismissed(), Date.now())) return;
    const ua = navigator.userAgent;
    setPlatform(detectInstallPlatform(ua, navigator.maxTouchPoints));
    setIosSafari(isIosSafari(ua));
    setHidden(false);

    const onBefore = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setHidden(true);
    window.addEventListener('beforeinstallprompt', onBefore);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBefore);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(INSTALL_DISMISS_KEY, String(Date.now()));
    } catch {
      /* private mode: just hide for this session */
    }
    setHidden(true);
  };

  const install = async () => {
    if (!deferred) return;
    haptic('tap');
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === 'accepted') haptic('success');
    } catch {
      /* ignore */
    }
    setDeferred(null);
    dismiss();
  };

  if (hidden || !isPrivatePath(pathname)) return null;
  const showIos = platform === 'ios' && iosSafari;
  if (!deferred && !showIos) return null;

  return (
    <section
      aria-label="Install Prism OS"
      className="md:hidden fixed inset-x-3 z-40 rounded-2xl border border-border-primary bg-bg-elevated p-3 shadow-3xl bottom-[calc(env(safe-area-inset-bottom)+5.5rem)]"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-text-primary text-bg-primary" aria-hidden="true">
          <Download size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-text-primary">Install Prism OS</p>
          {deferred ? (
            <p className="text-xs text-text-tertiary">Open it from your home screen like an app.</p>
          ) : (
            <details className="text-xs text-text-tertiary">
              <summary className="min-h-11 flex items-center cursor-pointer text-text-secondary">How to add it</summary>
              <ol className="list-decimal space-y-1 pb-2 pl-4">
                <li>Tap the Share button in Safari.</li>
                <li>Choose Add to Home Screen.</li>
                <li>Tap Add.</li>
              </ol>
            </details>
          )}
        </div>
        {deferred && (
          <button
            type="button"
            onClick={install}
            className="min-h-11 shrink-0 rounded-xl bg-text-primary px-4 text-sm font-bold text-bg-primary"
          >
            Install
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss install prompt"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-text-tertiary"
        >
          <X size={18} />
        </button>
      </div>
    </section>
  );
}
