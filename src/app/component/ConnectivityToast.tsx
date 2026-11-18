'use client';

import { useEffect, useRef, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

type State = 'online' | 'offline' | 'restored';

/** Announces connection changes politely (aria-live) and never blocks the page. */
export function ConnectivityToast() {
  const [state, setState] = useState<State>('online');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) setState('offline');
    const goOffline = () => {
      if (timer.current) clearTimeout(timer.current);
      setState('offline');
    };
    const goOnline = () => {
      setState('restored');
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setState('online'), 3000);
    };
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+3.75rem)] z-[70] flex justify-center px-4"
    >
      {state !== 'online' && (
        <p
          className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold shadow-3xl bg-bg-elevated ${
            state === 'offline' ? 'border-warning text-warning' : 'border-success text-success'
          }`}
        >
          {state === 'offline' ? <WifiOff size={14} aria-hidden="true" /> : <Wifi size={14} aria-hidden="true" />}
          {state === 'offline' ? 'You are offline. Changes will not sync.' : 'Back online'}
        </p>
      )}
    </div>
  );
}
