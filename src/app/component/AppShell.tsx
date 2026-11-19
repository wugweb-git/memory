"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Command, Menu, LogOut, LogIn, X } from 'lucide-react';
import { APP_BRAND, NAV_GROUPS, MOBILE_DOCK_ITEMS, SIDEBAR_STATS } from '@/config/ui-content';
import { toSessionView } from '@/lib/auth/session-view';
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
  const drawerRef = useRef<HTMLElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  // Close the drawer when the route changes.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Drawer behaves as a modal dialog: focus moves in, Tab is trapped, Esc closes,
  // body scroll is locked, and focus returns to the menu button on close.
  useEffect(() => {
    if (!drawerOpen) return;
    const drawer = drawerRef.current;
    const opener = menuButtonRef.current;
    const focusables = () =>
      Array.from(
        drawer?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? []
      );
    focusables()[0]?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setDrawerOpen(false);
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      } else if (drawer && !drawer.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      opener?.focus();
    };
  }, [drawerOpen]);

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

  // Session state for the topbar account entry.
  const [session, setSession] = useState<{ email: string; role: string } | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  useEffect(() => {
    fetch(UI_API.authMe, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then(setSession)
      .catch(() => setSession(null))
      .finally(() => setSessionChecked(true));
  }, []);
  const view = toSessionView(sessionChecked, session);
  const signOut = async () => {
    setSigningOut(true);
    try {
      await fetch(UI_API.authLogout, { method: 'POST', credentials: 'include' });
    } catch {
      /* fall through to login either way */
    }
    window.location.assign('/login');
  };
  const loginHref = `/login?next=${encodeURIComponent(pathname)}`;
  const navGroups = NAV_GROUPS
    .map((g) => ({ ...g, items: g.items.filter((i) => featureOn(i.feature)) }))
    .filter((g) => g.items.length > 0);
  const dockItems = MOBILE_DOCK_ITEMS.filter((i) => featureOn(i.feature));

  // Plain render helpers (not components) so state changes never remount the drawer and drop focus.
  const NavList = ({ onNavigate, label }: { onNavigate?: () => void; label: string }) => (
    <nav aria-label={label} className="flex-1 overflow-y-auto py-4 px-3 custom-scrollbar">
      {navGroups.map((group) => (
        <div key={group.group} className="mb-5">
          <p className="text-2xs font-black text-text-tertiary uppercase tracking-[0.3em] px-3 mb-1.5">
            {group.group}
          </p>
          {group.items.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className={`w-full flex items-center gap-3 px-3 min-h-11 rounded-2xl text-sm font-medium transition-all duration-150 mb-0.5 ${
                  active
                    ? 'bg-accent-high text-bg-primary shadow-sm'
                    : 'text-text-tertiary hover:bg-secondary hover:text-text-primary'
                }`}
              >
                <Icon size={16} aria-hidden="true" className={active ? 'text-bg-primary' : 'text-text-tertiary'} strokeWidth={active ? 2.5 : 2} />
                <span className="flex-1 text-left leading-none">{label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );

  const SidebarInner = ({ onNavigate, navLabel }: { onNavigate?: () => void; navLabel: string }) => (
    <>
      <div className="h-14 flex items-center gap-3 px-5 border-b border-border-secondary shrink-0">
        <div className="w-7 h-7 rounded-xl bg-text-primary flex items-center justify-center shadow-lg">
          <Command size={14} className="text-bg-primary" />
        </div>
        <div>
          <span className="text-sm font-black text-text-primary tracking-tight ">{APP_BRAND.name}</span>
          <div className="flex items-center gap-1 mt-0.5" role="status">
            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" aria-hidden="true" />
            <span className="text-2xs font-bold text-text-tertiary uppercase tracking-widest">{APP_BRAND.statusLabel}</span>
          </div>
        </div>
      </div>

      {NavList({ onNavigate, label: navLabel })}

      <div className="px-4 py-3 border-t border-border-secondary space-y-2">
        {SIDEBAR_STATS.map((s) => (
          <div key={s.label} className="flex items-center gap-2.5">
            <span className={`w-1.5 h-1.5 rounded-full ${s.colorClass === 'text-accent' ? 'bg-accent' : 'bg-success'}`} />
            <span className="text-2xs text-text-tertiary flex-1 font-mono">{s.label}</span>
            <span className="text-2xs font-bold text-text-secondary font-mono">{s.value}</span>
          </div>
        ))}
      </div>

      <div className="px-3 py-3 border-t border-border-secondary space-y-1">
        {view.state === 'loading' && (
          <div className="flex items-center gap-3 p-2.5 min-h-[44px]" role="status" aria-busy="true" aria-label="Checking session">
            <div className="w-8 h-8 rounded-full bg-secondary animate-pulse" />
            <div className="flex-1 space-y-1.5">
              <div className="h-2.5 w-24 rounded bg-secondary animate-pulse" />
              <div className="h-2 w-14 rounded bg-secondary animate-pulse" />
            </div>
          </div>
        )}
        {view.state === 'signed-in' && (
          <>
            <div className="flex items-center gap-3 p-2.5 min-h-[44px]">
              <span className="w-8 h-8 shrink-0 rounded-full bg-text-primary text-bg-primary text-xs font-bold flex items-center justify-center">
                {view.initial}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-text-primary truncate">{view.email}</p>
                <p className="text-2xs text-text-tertiary truncate">{view.role}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={signOut}
              disabled={signingOut}
              className="w-full flex items-center gap-3 px-3 min-h-[44px] rounded-2xl text-sm font-medium text-text-secondary hover:bg-secondary hover:text-text-primary transition-colors disabled:opacity-60"
            >
              <LogOut size={16} aria-hidden="true" />
              <span>{signingOut ? 'Signing out…' : 'Sign out'}</span>
            </button>
          </>
        )}
        {view.state === 'signed-out' && (
          <Link
            href={loginHref}
            onClick={onNavigate}
            className="w-full flex items-center gap-3 px-3 min-h-[44px] rounded-2xl text-sm font-medium text-text-primary hover:bg-secondary transition-colors"
          >
            <LogIn size={16} aria-hidden="true" />
            <span>Sign in</span>
          </Link>
        )}
      </div>
    </>
  );

  return (
    <div className="min-h-dvh bg-bg-primary text-text-primary">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-[calc(env(safe-area-inset-top)+0.75rem)] focus:z-[100] focus:rounded-xl focus:bg-text-primary focus:px-4 focus:py-3 focus:text-sm focus:font-bold focus:text-bg-primary"
      >
        Skip to main content
      </a>

      {/* Desktop sidebar */}
      <aside aria-label="Sidebar" className="hidden md:flex fixed top-0 left-0 h-dvh w-60 flex-col z-40 select-none bg-bg-elevated border-r border-border-secondary">
        {SidebarInner({ navLabel: 'Primary' })}
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            tabIndex={-1}
            className="md:hidden fixed inset-0 z-50 bg-text-primary/30 backdrop-blur-sm"
            onClick={closeDrawer}
          />
          <aside
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="md:hidden fixed top-0 left-0 h-dvh w-[min(16rem,85vw)] flex flex-col z-[60] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] overscroll-contain bg-bg-elevated border-r border-border-secondary"
          >
            <button
              type="button"
              aria-label="Close menu"
              onClick={closeDrawer}
              className="absolute right-2 top-[calc(env(safe-area-inset-top)+0.5rem)] z-10 flex h-11 w-11 items-center justify-center rounded-xl text-text-secondary hover:bg-secondary"
            >
              <X size={18} aria-hidden="true" />
            </button>
            {SidebarInner({ onNavigate: closeDrawer, navLabel: 'Mobile primary' })}
          </aside>
        </>
      )}

      {/* Top bar */}
      <header className="fixed top-0 right-0 left-0 md:left-60 z-30 h-[calc(3.5rem+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] bg-bg-elevated/90 backdrop-blur-xl border-b border-border-secondary flex items-center justify-between pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] md:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            ref={menuButtonRef}
            aria-label="Open menu"
            aria-haspopup="dialog"
            aria-expanded={drawerOpen}
            className="md:hidden min-w-[44px] min-h-[44px] -ml-2 flex items-center justify-center text-text-secondary hover:text-text-primary"
            onClick={() => setDrawerOpen(true)}
          >
            <Menu size={20} aria-hidden="true" />
          </button>
          <Link href="/console" className="md:hidden flex min-h-11 items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-text-primary flex items-center justify-center">
              <Command size={14} aria-hidden="true" className="text-bg-primary" />
            </div>
            <span className="text-sm font-bold tracking-tight text-text-primary">{APP_BRAND.name}</span>
          </Link>
        </div>
        {view.state === 'signed-in' && (
          <div className="flex items-center gap-2 px-3 min-h-[44px]">
            <span className="w-6 h-6 rounded-full bg-text-primary text-bg-primary text-2xs font-bold flex items-center justify-center">
              {view.initial}
            </span>
            <span className="text-xs font-semibold text-text-secondary hidden sm:block">{view.role}</span>
          </div>
        )}
        {view.state === 'signed-out' && (
          <Link
            href={loginHref}
            className="flex items-center min-h-[44px] px-4 rounded-full bg-text-primary text-bg-primary text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Sign in
          </Link>
        )}
      </header>

      {/* Content */}
      <main
        id="main-content"
        tabIndex={-1}
        className={`md:pl-60 pt-[calc(3.5rem+env(safe-area-inset-top))] focus:outline-none ${
          bottomDock ? 'pb-[calc(11rem+env(safe-area-inset-bottom))] md:pb-12' : 'pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-12'
        }`}
      >
        <div className="max-w-6xl mx-auto pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] md:px-8 py-6 md:py-8">
          {children}
        </div>
      </main>

      {/* Mobile bottom dock */}
      <nav aria-label="Quick navigation" className="md:hidden fixed bottom-0 left-0 right-0 z-30 glass-panel border-t border-border-secondary safe-navbar">
        <div className="flex items-stretch justify-around px-2 pt-2">
          {dockItems.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-11 min-w-11 flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-colors ${
                  active ? 'text-text-primary' : 'text-text-tertiary'
                }`}
              >
                <span className={`flex items-center justify-center w-9 h-7 rounded-full ${active ? 'bg-accent-high text-bg-primary' : ''}`}>
                  <Icon size={16} aria-hidden="true" />
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
