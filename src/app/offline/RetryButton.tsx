'use client';

export function RetryButton() {
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      className="inline-flex min-h-11 items-center rounded-xl bg-text-primary px-5 text-sm font-bold text-bg-primary"
    >
      Try again
    </button>
  );
}
