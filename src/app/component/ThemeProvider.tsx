"use client";

import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { MotionConfig } from 'framer-motion';

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const root = document.documentElement;
    // Forced Light Mode for 2026 Neo-minimalist overhaul
    root.setAttribute('data-theme', 'light');
    localStorage.setItem('theme', 'light');
  }, []);

  // reducedMotion="user": framer-motion skips transform/layout animation when the OS asks for reduced motion.
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
