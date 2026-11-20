'use client';

export function RetryButton() {
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-text-primary px-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 text-sm font-semibold text-bg-primary"
    >
      Retry connection
    </button>
  );
}
