'use client';

import { useEffect, useRef, useState } from 'react';
import { Share2, Check } from 'lucide-react';
import { haptic, shareOrCopy } from '@/lib/pwa/browser';

/** Native share sheet where available, copy-link fallback elsewhere. */
export function ShareButton({ title, text, className = '' }: { title: string; text?: string; className?: string }) {
  const [status, setStatus] = useState('');
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (clearTimer.current) clearTimeout(clearTimer.current); }, []);

  const onClick = async () => {
    haptic('tap');
    const result = await shareOrCopy({ title, text, url: window.location.href });
    if (result === 'copied') setStatus('Link copied');
    else if (result === 'failed') setStatus('Could not share. Copy the address from the browser bar.');
    else setStatus('');
    if (result === 'copied') haptic('success');
    if (result === 'copied' || result === 'failed') { if (clearTimer.current) clearTimeout(clearTimer.current); clearTimer.current = setTimeout(() => setStatus(''), 3000); }
  };

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex min-h-11 items-center gap-2 rounded-xl border border-border-secondary px-4 text-sm font-medium text-text-secondary hover:border-border-primary hover:text-text-primary transition-colors ${className}`}
      >
        {status === 'Link copied' ? <Check size={15} aria-hidden="true" /> : <Share2 size={15} aria-hidden="true" />}
        Share
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {status}
      </span>
    </>
  );
}
