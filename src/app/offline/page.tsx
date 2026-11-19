import { RetryButton } from './RetryButton';

export const metadata = { title: 'Offline | Identity Prism' };

export default function OfflinePage() {
  return (
    <main className="min-h-dvh-fallback flex items-center justify-center bg-bg-primary px-6 text-center">
      <div className="max-w-sm space-y-3">
        <h1 className="text-2xl font-bold text-text-primary">You are offline</h1>
        <p className="text-sm text-text-secondary">
          Prism OS needs a connection to load your memory and signals. Reconnect and try again.
        </p>
        <RetryButton />
      </div>
    </main>
  );
}
