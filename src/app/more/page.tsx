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
      <div className="space-y-4">
        {NAV_GROUPS.map((group) => {
          const headingId = `more-${group.group.toLowerCase()}`;
          return (
            <section key={group.group} aria-labelledby={headingId}>
              <h2 id={headingId} className="mb-2 px-4 text-sm font-medium text-text-secondary">
                {group.group}
              </h2>
              <ul className="divide-y divide-border-secondary overflow-hidden rounded-2xl border border-border-secondary bg-bg-elevated">
                {group.items.map(({ href, label, icon: Icon, hint }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="flex min-h-16 items-center gap-4 px-4 py-2 text-text-primary transition-colors hover:bg-bg-secondary active:bg-bg-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bg-secondary">
                        <Icon size={20} aria-hidden="true" className="text-text-secondary" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-base font-medium leading-snug">{label}</span>
                        {hint ? <span className="block truncate text-sm text-text-tertiary">{hint}</span> : null}
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
