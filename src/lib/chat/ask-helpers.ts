/** Pure helpers for the public /ask chat page. No React, no DOM. */

/**
 * Remembers when each message first appeared, keyed by message id.
 * The first call for an id stores the time; later calls return the same value,
 * so re-renders never change a message's timestamp.
 */
export function createTimestampStore(now: () => number = Date.now) {
  const seen = new Map<string, number>();
  return {
    stamp(id: string): number {
      const existing = seen.get(id);
      if (existing !== undefined) return existing;
      const t = now();
      seen.set(id, t);
      return t;
    },
    clear(): void {
      seen.clear();
    },
    size(): number {
      return seen.size;
    },
  };
}

export type ScrollMetrics = { scrollTop: number; scrollHeight: number; clientHeight: number };

/** True when the reader is within `threshold` px of the bottom of a scroll region. */
export function isNearBottom(m: ScrollMetrics, threshold = 80): boolean {
  return m.scrollHeight - m.scrollTop - m.clientHeight <= threshold;
}

/**
 * Decides what the Enter key does in the composer.
 * Desktop: Enter sends, Shift+Enter adds a newline.
 * Touch devices: Enter always adds a newline (the Send button sends).
 * Never sends while an IME composition is active.
 */
export function enterKeyAction(opts: {
  key: string;
  shiftKey: boolean;
  isComposing: boolean;
  coarsePointer: boolean;
}): 'send' | 'newline' {
  if (opts.key !== 'Enter' || opts.isComposing) return 'newline';
  if (opts.coarsePointer || opts.shiftKey) return 'newline';
  return 'send';
}

/** Height for an auto-growing textarea: grows to `maxLines`, then scrolls. */
export function clampTextareaHeight(scrollHeight: number, lineHeight: number, maxLines = 4, verticalPadding = 0): number {
  const max = lineHeight * maxLines + verticalPadding;
  return Math.min(scrollHeight, max);
}

/** Short local time such as "14:05". */
export function formatMessageTime(ms: number, locale = 'en-GB'): string {
  return new Date(ms).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}
