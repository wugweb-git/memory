'use client';

import { useEffect, useRef } from 'react';

/**
 * Root-layout failure: globals.css is not loaded here, so styles are inline with
 * token variables where present and system colours as readable fallbacks.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);

  const control = {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: 44,
    padding: '0 20px',
    font: 'inherit',
    fontWeight: 700,
    fontSize: 14,
    color: 'var(--text-primary, CanvasText)',
    background: 'var(--bg-primary, Canvas)',
    border: '1px solid var(--border-primary, GrayText)',
    cursor: 'pointer',
    textDecoration: 'none',
  } as const;

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif',
          background: 'var(--bg-primary, Canvas)',
          color: 'var(--text-primary, CanvasText)',
          colorScheme: 'light dark',
        }}
      >
        <div role="alert" style={{ maxWidth: 384 }}>
          <h1 ref={heading} tabIndex={-1} style={{ fontSize: 24, fontWeight: 600, margin: '0 0 12px', outline: 'none' }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 14, margin: '0 0 12px', color: 'var(--text-secondary, GrayText)' }}>
            The app could not load. Your data is safe. Try again, or go to the console.
          </p>
          {error?.digest ? (
            <p style={{ fontSize: 12, margin: '0 0 12px', color: 'var(--text-tertiary, GrayText)' }}>Reference: {error.digest}</p>
          ) : null}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', paddingTop: 8 }}>
            <button type="button" onClick={() => reset()} style={control}>
              Try again
            </button>
            <a href="/console" style={control}>
              Go to console
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
