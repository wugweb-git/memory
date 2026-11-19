import type { Metadata } from 'next';
import Link from 'next/link';
import { IDENTITY_CONFIG } from '@/config/identity';

export const metadata: Metadata = { title: 'Page not found' };

const linkBase =
  'inline-flex min-h-11 items-center rounded-xl px-5 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2';

export default function NotFound() {
  return (
    <main className="min-h-dvh-fallback flex items-center justify-center bg-bg-primary px-6 text-center">
      <div className="max-w-sm space-y-3">
        <p className="text-2xs font-semibold uppercase tracking-wider text-text-tertiary">Error 404</p>
        <h1 className="text-2xl font-semibold text-text-primary">Page not found</h1>
        <p className="text-sm text-text-secondary">
          The page you are looking for does not exist or has moved. Check the address, or head back to a page that does.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link href="/console" className={`${linkBase} bg-text-primary text-bg-primary`}>
            Go to console
          </Link>
          <Link
            href={`/p/${IDENTITY_CONFIG.HANDLE}`}
            className={`${linkBase} border border-border-primary text-text-primary`}
          >
            View public profile
          </Link>
        </div>
      </div>
    </main>
  );
}
