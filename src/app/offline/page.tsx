import { RetryButton } from './RetryButton';

export const metadata = { title: 'Offline' };

export default function OfflinePage() {
  return (
    <main className="min-h-dvh-fallback flex items-center justify-center bg-bg-primary px-6 text-center">
      <div className="max-w-sm space-y-3">
        <h1 className="text-2xl font-semibold text-text-primary">You are offline</h1>
        <p className="text-base text-text-secondary">
          Prism OS needs an internet connection to load your memory and signals. Check your Wi-Fi or mobile data, then try again.
        </p>
        <RetryButton />
      </div>
    </main>
  );
}
