"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Command, Menu, X, Bell } from 'lucide-react';
import { APP_BRAND, NAV_GROUPS, MOBILE_DOCK_ITEMS, SIDEBAR_STATS } from '@/config/ui-content';
import { IDENTITY_CONFIG, avatarFallbackUrl } from '@/config/identity';
import { UI_API } from '@/lib/api/endpoints';

type AppShellProps = {
  children: React.ReactNode;
  /** Extra bottom padding when a page renders its own fixed dock (e.g. /ask) */
  bottomDock?: boolean;
};

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}

/** Single source of truth for app chrome: route-aware sidebar (desktop),
 *  top bar, mobile drawer, and bottom dock (mobile). */
export function AppShell({ children, bottomDock = false }: AppShellProps) {
  const pathname = usePathname() || '/';
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Runtime module flags (toggled from /system). Until they load, the static
  // config-filtered nav renders as-is — no flash of hidden modules re-appearing.
  const [flags, setFlags] = useState<Record<string, boolean> | null>(null);
  useEffect(() => {
    fetch(UI_API.systemFeatures)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j?.features && setFlags(j.features))
      .catch(() => {});
  }, []);
  const featureOn = (key?: string) => !key || flags === null || flags[key] !== false;
  const navGroups = NAV_GROUPS
    .map((g) => ({ ...g, items: g.items.filter((i) => featureOn(i.feature)) }))
    .filter((g) => g.items.length > 0);
  const dockItems = MOBILE_DOCK_ITEMS.filter((i) => featureOn(i.feature));

  const NavList = ({ onNavigate }: { onNavigate?: () => void }) => (
    <nav className="flex-1 overflow-y-auto py-4 px-3 custom-scrollbar">
      {navGroups.map((group) => (
        <div key={group.group} className="mb-5">
          <p className="text-2xs font-black text-text-disabled uppercase tracking-[0.3em] px-3 mb-1.5">
            {group.group}
          </p>
          {group.items.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-all duration-150 mb-0.5 ${
                  active
                    ? 'bg-accent-high text-bg-primary shadow-sm'
                    : 'text-text-tertiary hover:bg-secondary hover:text-text-primary'
                }`}
              >
                <Icon size={16} className={active ? 'text-bg-primary' : 'text-text-disabled'} strokeWidth={active ? 2.5 : 2} />
                <span className="flex-1 text-left leading-none">{label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );

  const SidebarInner = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      <div className="h-14 flex items-center gap-3 px-5 border-b border-border-secondary shrink-0">
        <div className="w-7 h-7 rounded-xl bg-text-primary flex items-center justify-center shadow-lg">
          <Command size={14} className="text-bg-primary" />
        </div>
        <div>
          <span className="text-sm font-black text-text-primary tracking-tight ">{APP_BRAND.name}</span>
          <div className="flex items-center gap-1 mt-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            <span className="text-2xs font-bold text-text-tertiary uppercase tracking-widest">{APP_BRAND.statusLabel}</span>
          </div>
        </div>
      </div>

      <NavList onNavigate={onNavigate} />

      <div className="px-4 py-3 border-t border-border-secondary space-y-2">
        {SIDEBAR_STATS.map((s) => (
          <div key={s.label} className="flex items-center gap-2.5">
            <span className={`w-1.5 h-1.5 rounded-full ${s.colorClass === 'text-accent' ? 'bg-accent' : 'bg-success'}`} />
            <span className="text-2xs text-text-disabled flex-1 font-mono">{s.label}</span>
            <span className="text-2xs font-bold text-text-secondary font-mono">{s.value}</span>
          </div>
        ))}
      </div>

      <div className="px-3 py-3 border-t border-border-secondary">
        <div className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-secondary transition-colors">
          <img src={avatarFallbackUrl(64)} alt={IDENTITY_CONFIG.DISPLAY_NAME} className="w-8 h-8 rounded-full border border-border-primary" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-text-primary truncate">{IDENTITY_CONFIG.DISPLAY_NAME}</p>
            <p className="text-2xs text-text-tertiary truncate">{IDENTITY_CONFIG.ROLE}</p>
          </div>
          <Bell size={14} className="text-text-disabled" />
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed top-0 left-0 h-screen w-60 flex-col z-40 select-none bg-bg-elevated border-r border-border-secondary">
        <SidebarInner />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="md:hidden fixed inset-0 z-50 bg-text-primary/30 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="md:hidden fixed top-0 left-0 h-screen w-64 flex flex-col z-[60] bg-bg-elevated border-r border-border-secondary">
            <SidebarInner onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </>
      )}

      {/* Top bar */}
      <header className="fixed top-0 right-0 left-0 md:left-60 z-30 h-14 bg-bg-elevated/90 backdrop-blur-xl border-b border-border-secondary flex items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Open menu"
            className="md:hidden p-2 -ml-2 text-text-secondary hover:text-text-primary"
            onClick={() => setDrawerOpen(true)}
          >
            <Menu size={20} />
          </button>
          <Link href="/" className="md:hidden flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-text-primary flex items-center justify-center">
              <Command size={14} className="text-bg-primary" />
            </div>
            <span className="text-sm font-bold tracking-tight text-text-primary">{APP_BRAND.name}</span>
          </Link>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary border border-border-secondary">
          <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" aria-hidden />
          <span className="text-2xs font-black uppercase tracking-widest text-text-tertiary hidden sm:block">{APP_BRAND.statusLabel}</span>
        </div>
      </header>

      {/* Content */}
      <main className={`md:pl-60 pt-14 ${bottomDock ? 'pb-44 md:pb-12' : 'pb-24 md:pb-12'}`}>
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8">
          {children}
        </div>
      </main>

      {/* Mobile bottom dock */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 glass-panel border-t border-border-secondary safe-navbar">
        <div className="flex items-stretch justify-around px-2 pt-2">
          {dockItems.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-colors ${
                  active ? 'text-text-primary' : 'text-text-disabled'
                }`}
              >
                <span className={`flex items-center justify-center w-9 h-7 rounded-full ${active ? 'bg-accent-high text-bg-primary' : ''}`}>
                  <Icon size={16} />
                </span>
                <span className="text-2xs font-bold">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
