import Link from 'next/link';

export const metadata = { title: 'Page not found' };

export default function NotFound() {
  return (
    <main id="main-content" className="mx-auto flex min-h-[60vh] max-w-md flex-col items-start justify-center gap-4 px-4 py-12">
      <h1 className="text-xl font-semibold text-text-primary">Page not found</h1>
      <p className="text-base text-text-secondary">That page does not exist or has moved.</p>
      <Link
        href="/console"
        className="inline-flex min-h-11 items-center rounded-full border border-border-primary bg-bg-elevated px-5 text-sm font-medium text-text-primary hover:bg-bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        Go to console
      </Link>
    </main>
  );
}
