"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Command, Menu, LogOut, LogIn, X } from 'lucide-react';
import {
  APP_BRAND,
  NAV_GROUPS,
  MOBILE_DOCK_ITEMS,
  SIDEBAR_STATS,
  findNavItem,
  isNavActive,
} from '@/config/ui-content';
import { toSessionView } from '@/lib/auth/session-view';
import { UI_API } from '@/lib/api/endpoints';

type AppShellProps = {
  children: React.ReactNode;
  /** Extra bottom padding when a page renders its own fixed dock (e.g. /ask) */
  bottomDock?: boolean;
};

const ACTION_SLOT_ID = 'shell-action-slot';

/** Puts one contextual action (a button, a short menu) in the topbar, right of the page title.
 *  Render it anywhere inside a page that is wrapped by AppShell. Keep it to one primary action. */
export function TopbarAction({ children }: { children: React.ReactNode }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setSlot(document.getElementById(ACTION_SLOT_ID));
  }, []);
  return slot ? createPortal(children, slot) : null;
}

/** Single source of truth for app chrome: route-aware sidebar (desktop),
 *  top bar (page title + one action slot), mobile drawer, and bottom dock (mobile). */
export function AppShell({ children, bottomDock = false }: AppShellProps) {
  const pathname = usePathname() || '/';
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const mainRef = useRef<HTMLElement | null>(null);
  const skipFocusReturn = useRef(false);
  const firstRoute = useRef(true);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const openDrawer = useCallback(() => {
    openerRef.current = document.activeElement as HTMLElement | null;
    setDrawerOpen(true);
  }, []);

  // On route change: close the drawer (without pulling focus back to the menu button) and move
  // focus to <main> so keyboard and screen-reader users land on the new page, not the old link.
  useEffect(() => {
    if (firstRoute.current) {
      firstRoute.current = false;
      return;
    }
    skipFocusReturn.current = true;
    setDrawerOpen(false);
    mainRef.current?.focus({ preventScroll: true });
  }, [pathname]);

  // Drawer behaves as a modal dialog: focus moves in, Tab is trapped, Esc closes,
  // body scroll is locked, and focus returns to the control that opened it.
  useEffect(() => {
    if (!drawerOpen) return;
    const drawer = drawerRef.current;
    const opener = openerRef.current;
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
      if (skipFocusReturn.current) skipFocusReturn.current = false;
      else opener?.focus();
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
  // "More" reads as current when the page lives only in the drawer.
  const moreActive = !dockItems.some((i) => isNavActive(pathname, i.href));
  const pageTitle = findNavItem(pathname)?.label ?? APP_BRAND.name;

  // Plain render helpers (not components) so state changes never remount the drawer and drop focus.
  const NavList = ({ onNavigate, label, hints }: { onNavigate?: () => void; label: string; hints?: boolean }) => (
    <nav aria-label={label} className="flex-1 overflow-y-auto py-4 px-3 custom-scrollbar">
      {navGroups.map((group) => {
        const headingId = `${label.replace(/\s+/g, '-').toLowerCase()}-${group.group.toLowerCase()}`;
        return (
          <div key={group.group} role="group" aria-labelledby={headingId} className="mb-6">
            <p
              id={headingId}
              className="text-2xs font-semibold text-text-tertiary uppercase tracking-widest px-3 mb-2"
            >
              {group.group}
            </p>
            {group.items.map(({ href, label: itemLabel, icon: Icon, hint }) => {
              const active = isNavActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onNavigate}
                  aria-current={active ? 'page' : undefined}
                  className={`w-full flex items-center gap-3 px-3 min-h-11 rounded-control text-sm transition-colors duration-fast ease-standard mb-0.5 ${
                    active
                      ? 'bg-accent-high text-bg-primary font-semibold'
                      : 'text-text-secondary font-medium hover:bg-secondary hover:text-text-primary'
                  }`}
                >
                  <Icon size={18} aria-hidden="true" className="shrink-0" strokeWidth={active ? 2.5 : 2} />
                  <span className="flex-1 min-w-0 text-left">
                    <span className="block leading-snug">{itemLabel}</span>
                    {hints && hint ? (
                      <span className={`block text-2xs leading-snug font-normal ${active ? 'text-bg-secondary' : 'text-text-tertiary'}`}>
                        {hint}
                      </span>
                    ) : null}
                  </span>
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );

  const SidebarInner = ({ onNavigate, navLabel, hints }: { onNavigate?: () => void; navLabel: string; hints?: boolean }) => (
    <>
      <div className="h-14 flex items-center gap-3 px-5 border-b border-border-secondary shrink-0">
        <div className="w-7 h-7 rounded-control bg-text-primary flex items-center justify-center">
          <Command size={14} aria-hidden="true" className="text-bg-primary" />
        </div>
        <div>
          <span className="text-sm font-bold text-text-primary tracking-tight">{APP_BRAND.name}</span>
          <div className="flex items-center gap-1 mt-0.5" role="status">
            <div className="w-1.5 h-1.5 rounded-full bg-success motion-safe:animate-pulse" aria-hidden="true" />
            <span className="text-2xs font-semibold text-text-tertiary uppercase tracking-widest">{APP_BRAND.statusLabel}</span>
          </div>
        </div>
      </div>

      {NavList({ onNavigate, label: navLabel, hints })}

      <div className="px-4 py-3 border-t border-border-secondary space-y-2">
        {SIDEBAR_STATS.map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full ${s.colorClass === 'text-accent' ? 'bg-accent' : 'bg-success'}`} />
            <span className="text-2xs text-text-tertiary flex-1 font-mono">{s.label}</span>
            <span className="text-2xs font-bold text-text-secondary font-mono">{s.value}</span>
          </div>
        ))}
      </div>

      <div className="px-3 py-3 border-t border-border-secondary space-y-1">
        {view.state === 'loading' && (
          <div className="flex items-center gap-3 p-2 min-h-11" role="status" aria-busy="true" aria-label="Checking session">
            <div aria-hidden="true" className="w-8 h-8 rounded-pill bg-secondary motion-safe:animate-pulse" />
            <div className="flex-1 space-y-1.5">
              <div className="h-2.5 w-24 rounded-xs bg-secondary motion-safe:animate-pulse" />
              <div className="h-2 w-14 rounded-xs bg-secondary motion-safe:animate-pulse" />
            </div>
          </div>
        )}
        {view.state === 'signed-in' && (
          <>
            <div className="flex items-center gap-3 p-2 min-h-11">
              <span className="w-8 h-8 shrink-0 rounded-pill bg-text-primary text-bg-primary text-xs font-bold flex items-center justify-center">
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
              className="w-full flex items-center gap-3 px-3 min-h-11 rounded-control text-sm font-medium text-text-secondary hover:bg-secondary hover:text-text-primary transition-colors duration-fast ease-standard disabled:opacity-60"
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
            className="w-full flex items-center gap-3 px-3 min-h-11 rounded-control text-sm font-medium text-text-primary hover:bg-secondary transition-colors duration-fast ease-standard"
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
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-[calc(env(safe-area-inset-top)+0.75rem)] focus:z-[100] focus:rounded-control focus:bg-text-primary focus:px-4 focus:py-3 focus:text-sm focus:font-bold focus:text-bg-primary"
      >
        Skip to main content
      </a>

      {/* Desktop sidebar */}
      <aside aria-label="Sidebar" className="hidden md:flex fixed top-0 left-0 h-dvh w-[var(--sidebar-w)] flex-col z-40 select-none bg-bg-elevated border-r border-border-secondary">
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
            className="md:hidden fixed top-0 left-0 h-dvh w-[min(19rem,88vw)] flex flex-col z-[60] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] overscroll-contain bg-bg-elevated border-r border-border-secondary shadow-elev-3"
          >
            <button
              type="button"
              aria-label="Close menu"
              onClick={closeDrawer}
              className="absolute right-2 top-[calc(env(safe-area-inset-top)+0.5rem)] z-10 flex h-11 w-11 items-center justify-center rounded-control text-text-secondary hover:bg-secondary"
            >
              <X size={18} aria-hidden="true" />
            </button>
            {SidebarInner({ onNavigate: closeDrawer, navLabel: 'Mobile primary', hints: true })}
          </aside>
        </>
      )}

      {/* Top bar: page title on the left, one contextual action slot, then the account entry. */}
      <header className="fixed top-0 right-0 left-0 md:left-[var(--sidebar-w)] z-30 h-[calc(var(--topbar-h)+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] bg-bg-elevated/90 backdrop-blur-xl border-b border-border-secondary flex items-center justify-between gap-2 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] md:px-8">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href="/console"
            aria-label={`${APP_BRAND.name} home`}
            className="md:hidden -ml-2 flex min-h-11 min-w-11 shrink-0 items-center justify-center"
          >
            <span className="w-7 h-7 rounded-control bg-text-primary flex items-center justify-center">
              <Command size={14} aria-hidden="true" className="text-bg-primary" />
            </span>
          </Link>
          <p className="truncate text-base font-semibold tracking-tight text-text-primary">{pageTitle}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div id={ACTION_SLOT_ID} className="flex items-center gap-2" />
          {view.state === 'signed-in' && (
            <div className="flex items-center gap-2 min-h-11">
              <span className="w-6 h-6 rounded-pill bg-text-primary text-bg-primary text-2xs font-bold flex items-center justify-center">
                {view.initial}
              </span>
              <span className="text-xs font-semibold text-text-secondary hidden sm:block">{view.role}</span>
            </div>
          )}
          {view.state === 'signed-out' && (
            <Link
              href={loginHref}
              className="flex items-center min-h-11 px-4 rounded-pill bg-text-primary text-bg-primary text-sm font-semibold hover:bg-text-secondary transition-colors duration-fast ease-standard"
            >
              Sign in
            </Link>
          )}
        </div>
      </header>

      {/* Content: padded under the topbar and above the dock, so nothing is hidden behind fixed bars. */}
      <main
        ref={mainRef}
        id="main-content"
        tabIndex={-1}
        className={`md:pl-[var(--sidebar-w)] pt-topbar focus:outline-none ${
          bottomDock
            ? 'pb-[calc(var(--dock-h)+env(safe-area-inset-bottom)+6rem)] md:pb-12'
            : 'pb-dock md:pb-12'
        }`}
      >
        <div className="page-enter max-w-content mx-auto pl-[max(var(--gutter),env(safe-area-inset-left))] pr-[max(var(--gutter),env(safe-area-inset-right))] py-6 md:py-8">
          {children}
        </div>
      </main>

      {/* Mobile bottom dock: four top destinations plus More (opens the full menu).
          Current page = filled pill + bold label + aria-current, never colour alone. */}
      <nav
        aria-label="Quick navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 glass-panel border-t border-border-secondary pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]"
      >
        <ul className="flex h-[var(--dock-h)] items-stretch px-2">
          {dockItems.map(({ href, label, icon: Icon }) => {
            const active = isNavActive(pathname, href);
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex h-full flex-col items-center justify-center gap-1 rounded-control transition-colors duration-fast ease-standard ${
                    active ? 'text-text-primary' : 'text-text-secondary'
                  }`}
                >
                  <span
                    className={`flex h-7 w-12 items-center justify-center rounded-pill transition-colors duration-fast ease-standard ${
                      active ? 'bg-accent-high text-bg-primary' : ''
                    }`}
                  >
                    <Icon size={18} aria-hidden="true" strokeWidth={active ? 2.5 : 2} />
                  </span>
                  <span className={`text-2xs leading-none ${active ? 'font-bold' : 'font-medium'}`}>{label}</span>
                </Link>
              </li>
            );
          })}
          <li className="flex-1">
            <button
              type="button"
              aria-haspopup="dialog"
              aria-expanded={drawerOpen}
              onClick={openDrawer}
              className={`flex h-full w-full flex-col items-center justify-center gap-1 rounded-control transition-colors duration-fast ease-standard ${
                moreActive ? 'text-text-primary' : 'text-text-secondary'
              }`}
            >
              <span
                className={`flex h-7 w-12 items-center justify-center rounded-pill transition-colors duration-fast ease-standard ${
                  moreActive ? 'bg-accent-high text-bg-primary' : ''
                }`}
              >
                <Menu size={18} aria-hidden="true" strokeWidth={moreActive ? 2.5 : 2} />
              </span>
              <span className={`text-2xs leading-none ${moreActive ? 'font-bold' : 'font-medium'}`}>
                More
                {moreActive ? <span className="sr-only"> (current page is in this menu)</span> : null}
              </span>
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
