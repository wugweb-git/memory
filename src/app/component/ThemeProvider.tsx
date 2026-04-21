"use client";

import { useEffect } from 'react';
import type { ReactNode } from 'react';

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const root = document.documentElement;
    // Forced Light Mode for 2026 Neo-minimalist overhaul
    root.setAttribute('data-theme', 'light');
    localStorage.setItem('theme', 'light');
  }, []);

  return <>{children}</>;
}
