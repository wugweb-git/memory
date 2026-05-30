"use client";

import React from 'react';
import NavBar from './navbar';

type AppShellProps = {
  children: React.ReactNode;
  /** Extra bottom padding when a fixed dock is present (e.g. /ask) */
  bottomDock?: boolean;
};

/** Shared layout for standalone routes: top nav + safe content area */
export function AppShell({ children, bottomDock = false }: AppShellProps) {
  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col">
      <NavBar />
      <main
        className={`flex-1 pt-16 relative z-10 ${
          bottomDock ? 'pb-44 md:pb-48' : 'pb-8 md:pb-12'
        }`}
      >
        {children}
      </main>
    </div>
  );
}
