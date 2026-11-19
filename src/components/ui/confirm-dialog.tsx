'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/button';

/**
 * Next focus index for a Tab / Shift+Tab press inside a focus trap.
 * Cycles within [0, count). Returns -1 when there is nothing focusable.
 * `current` may be -1 when focus sits outside the list.
 */
export function nextFocusIndex(current: number, count: number, shift: boolean): number {
  if (count <= 0) return -1;
  if (current < 0 || current >= count) return shift ? count - 1 : 0;
  return shift ? (current - 1 + count) % count : (current + 1) % count;
}

/** Sentence for a rollback confirmation, naming the field and what it returns to. */
export function buildRollbackDescription(fieldLabel: string, changedOn?: string | null): string {
  const field = fieldLabel.trim().toLowerCase() || 'this field';
  const when = changedOn && changedOn.trim() ? ` it had before the change on ${changedOn.trim()}` : ' it had before this change';
  return `Your ${field} will return to the value${when}. The change stays in the timeline.`;
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'danger' | 'default';
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  tone = 'default',
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const uid = React.useId();
  const titleId = `${uid}-title`;
  const descId = `${uid}-desc`;
  const panelRef = React.useRef<HTMLDivElement>(null);
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = React.useState(false);
  const [shown, setShown] = React.useState(false);

  // Keep the latest callbacks without re-running the open/close effect.
  const cancelHandler = React.useRef(onCancel);
  cancelHandler.current = onCancel;
  const busyRef = React.useRef(busy);
  busyRef.current = busy;

  React.useEffect(() => setMounted(true), []);

  // Focus management, scroll lock and enter transition.
  React.useEffect(() => {
    if (!open) {
      setShown(false);
      return;
    }
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const body = document.body;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = 'hidden';
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;

    const raf = requestAnimationFrame(() => {
      setShown(true);
      cancelRef.current?.focus();
    });

    return () => {
      cancelAnimationFrame(raf);
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
      if (opener && document.contains(opener)) opener.focus();
    };
  }, [open]);

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      e.preventDefault();
      if (!busyRef.current) cancelHandler.current();
      return;
    }
    if (e.key !== 'Tab') return;
    const nodes = panelRef.current ? Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)) : [];
    if (nodes.length === 0) {
      e.preventDefault();
      panelRef.current?.focus();
      return;
    }
    const current = nodes.indexOf(document.activeElement as HTMLElement);
    const next = nextFocusIndex(current, nodes.length, e.shiftKey);
    e.preventDefault();
    nodes[next]?.focus();
  }

  if (!mounted || !open || typeof document === 'undefined') return null;

  const danger = tone === 'danger';

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      onKeyDown={onKeyDown}
    >
      <div
        aria-hidden="true"
        onClick={() => {
          if (!busy) onCancel();
        }}
        className={cn(
          'absolute inset-0 bg-text-primary/40 motion-safe:transition-opacity motion-safe:duration-200',
          shown ? 'opacity-100' : 'opacity-0',
        )}
      />
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
        className={cn(
          'relative w-full max-h-full overflow-y-auto border border-border-primary bg-bg-elevated text-text-primary shadow-lg outline-none',
          'rounded-t-2xl sm:max-w-md sm:rounded-2xl',
          'px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:p-6',
          'motion-safe:transition-all motion-safe:duration-200',
          shown ? 'translate-y-0 opacity-100 sm:scale-100' : 'translate-y-4 opacity-0 sm:translate-y-0 sm:scale-95',
        )}
      >
        <h2 id={titleId} className="text-lg font-semibold text-text-primary">
          {title}
        </h2>
        <p id={descId} className="mt-2 text-sm text-text-secondary">
          {description}
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border-primary bg-bg-elevated px-4 py-2 text-sm font-semibold text-text-primary hover:bg-bg-secondary disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:min-h-10"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            aria-busy={busy || undefined}
            className={cn(
              'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-70 sm:min-h-10',
              danger
                ? 'bg-danger text-bg-elevated hover:opacity-90'
                : 'bg-text-primary text-bg-primary hover:bg-text-secondary',
            )}
          >
            {busy ? <Spinner /> : null}
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Promise-free helper: tracks which item awaits confirmation.
 * `ask(payload)` opens the dialog, `close()` dismisses it, `pending` is the payload (or null).
 */
export function useConfirm<T>() {
  const [pending, setPending] = React.useState<T | null>(null);
  const ask = React.useCallback((payload: T) => setPending(payload), []);
  const close = React.useCallback(() => setPending(null), []);
  return { pending, open: pending !== null, ask, close };
}
