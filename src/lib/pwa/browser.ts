import { HAPTIC_PATTERNS, buildShareData, normalizeBadgeCount, type HapticKind, type ShareInput } from './helpers';

export function prefersReducedMotion(): boolean {
  try {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** Feature-detected haptic tap. Silent when unsupported or when reduced motion is on. */
export function haptic(kind: HapticKind = 'tap'): void {
  try {
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
    if (prefersReducedMotion()) return;
    navigator.vibrate(HAPTIC_PATTERNS[kind] as number | number[]);
  } catch {
    /* ignore */
  }
}

export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed';

/** Native share sheet first, clipboard second. */
export async function shareOrCopy(input: ShareInput): Promise<ShareResult> {
  const data = buildShareData(input);
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      if (typeof navigator.canShare !== 'function' || navigator.canShare(data)) {
        await navigator.share(data);
        return 'shared';
      }
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled';
    /* fall through to clipboard */
  }
  try {
    await navigator.clipboard.writeText(data.url);
    return 'copied';
  } catch {
    return 'failed';
  }
}

/** Badging API; only call with a real count. Pass 0/null to clear. */
export function setAppBadge(count: unknown): void {
  try {
    const nav = navigator as Navigator & {
      setAppBadge?: (n?: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    const n = normalizeBadgeCount(count);
    if (n === null) void nav.clearAppBadge?.().catch(() => {});
    else void nav.setAppBadge?.(n).catch(() => {});
  } catch {
    /* ignore */
  }
}

export function isStandalone(): boolean {
  try {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    );
  } catch {
    return false;
  }
}
