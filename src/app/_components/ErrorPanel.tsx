'use client';

import { useEffect, useRef } from 'react';

/** Friendly error surface. Shows no raw error text; only the digest as a reference id. */
export function ErrorPanel({ digest, reset }: { digest?: string; reset: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);

  return (
    <main className="min-h-dvh-fallback flex items-center justify-center bg-bg-primary px-6 text-center">
      <div role="alert" className="max-w-sm space-y-3">
        <h1 ref={heading} tabIndex={-1} className="text-2xl font-semibold text-text-primary focus:outline-none">
          Something went wrong
        </h1>
        <p className="text-sm text-text-secondary">
          This page hit an unexpected problem. Your data is safe. Try again, or go back to the console.
        </p>
        {digest ? <p className="text-xs text-text-tertiary">Reference: {digest}</p> : null}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex min-h-11 items-center rounded-xl bg-text-primary px-5 text-sm font-bold text-bg-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            Try again
          </button>
          <a
            href="/console"
            className="inline-flex min-h-11 items-center rounded-xl border border-border-primary px-5 text-sm font-bold text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            Go to console
          </a>
        </div>
      </div>
    </main>
  );
}
