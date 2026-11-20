'use client';

import Link from 'next/link';

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main-content" className="mx-auto flex min-h-[60vh] max-w-md flex-col items-start justify-center gap-4 px-4 py-12">
      <h1 className="text-xl font-semibold text-text-primary">Something went wrong</h1>
      <p className="text-base text-text-secondary">The page could not load. Try again, or head back to the console.</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => reset()}
          className="min-h-11 rounded-full border border-border-primary bg-bg-elevated px-5 text-sm font-medium text-text-primary hover:bg-bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Try again
        </button>
        <Link
          href="/console"
          className="inline-flex min-h-11 items-center rounded-full px-5 text-sm font-medium text-text-primary underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Go to console
        </Link>
      </div>
    </main>
  );
}
