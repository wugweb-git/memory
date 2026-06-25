"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { APP_NAV_ITEMS } from '@/config/ui-content';

/** Compact cross-route nav for full-bleed surfaces (memory, buffer, cognitive) */
export function StandaloneNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-[70] h-10 flex items-center gap-1 px-3 border-b border-white/10 bg-zinc-950/90 backdrop-blur-md overflow-x-auto scrollbar-hide"
      aria-label="Route navigation"
    >
      {APP_NAV_ITEMS.map(({ href, label }) => {
        const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`px-2.5 py-1 rounded-lg text-2xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors ${
              active ? 'bg-cyan-500/20 text-cyan-300' : 'text-zinc-500 hover:text-zinc-200'
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
