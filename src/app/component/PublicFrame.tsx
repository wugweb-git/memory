import Link from 'next/link';
import type { ReactNode } from 'react';
import { APP_BRAND } from '@/config/ui-content';
import { IDENTITY_CONFIG } from '@/config/identity';

/**
 * Minimal frame for pages that visitors can open without signing in (/ask).
 * No sidebar, no bottom dock and no links into the owner's private app:
 * only the brand and a link to the public profile.
 */
export function PublicFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh-fallback bg-bg-primary text-text-primary">
      <header className="h-16 px-5 flex items-center justify-between border-b border-border-secondary">
        <span className="text-sm font-bold tracking-tight">{APP_BRAND.name}</span>
        <Link
          href={`/p/${IDENTITY_CONFIG.HANDLE}`}
          className="min-h-11 inline-flex items-center px-3 text-sm text-text-secondary hover:text-text-primary"
        >
          Profile
        </Link>
      </header>
      {children}
    </div>
  );
}
