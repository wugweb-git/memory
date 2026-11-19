'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { AppShell } from '@/app/component/AppShell';
import { NAV_GROUPS } from '@/config/ui-content';

/** Mobile "More" tab: every destination on one screen, like a phone app's More list. */
export default function MorePage() {
  return (
    <AppShell>
      <h1 className="sr-only">More</h1>
      <div className="space-y-6">
        {NAV_GROUPS.map((group) => {
          const headingId = `more-${group.group.toLowerCase()}`;
          return (
            <section key={group.group} aria-labelledby={headingId}>
              <h2 id={headingId} className="mb-2 px-1 text-xs font-semibold text-text-tertiary">
                {group.group}
              </h2>
              <ul className="divide-y divide-border-secondary overflow-hidden rounded-2xl border border-border-secondary bg-bg-elevated">
                {group.items.map(({ href, label, icon: Icon, hint }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="flex min-h-14 items-center gap-3 px-4 py-2 text-text-primary transition-colors hover:bg-bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-bg-secondary">
                        <Icon size={18} aria-hidden="true" className="text-text-secondary" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold leading-snug">{label}</span>
                        {hint ? <span className="block truncate text-xs text-text-tertiary">{hint}</span> : null}
                      </span>
                      <ChevronRight size={16} aria-hidden="true" className="shrink-0 text-text-tertiary" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </AppShell>
  );
}
