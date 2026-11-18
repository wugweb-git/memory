/**
 * Pure PWA helpers (no DOM access at import time) so they can be unit tested.
 * Browser-facing wrappers live in `src/lib/pwa/browser.ts`.
 */

/** Routes that visitors can open without signing in. No install prompt, no app chrome. */
const PUBLIC_ROOTS = ['/p', '/ask', '/login', '/offline'];

export function isPrivatePath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return !PUBLIC_ROOTS.some((root) => pathname === root || pathname.startsWith(`${root}/`));
}

export type InstallPlatform = 'ios' | 'android' | 'other';

/** iPadOS 13+ reports as Macintosh; `maxTouchPoints` tells them apart from a Mac. */
export function detectInstallPlatform(ua: string, maxTouchPoints = 0): InstallPlatform {
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Macintosh/i.test(ua) && maxTouchPoints > 1) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'other';
}

/** iOS has no beforeinstallprompt; only Safari can add to the home screen. */
export function isIosSafari(ua: string): boolean {
  return /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA\//i.test(ua);
}

export const INSTALL_DISMISS_KEY = 'prism-install-dismissed-at';
export const INSTALL_SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;

/** Dismissed prompts stay hidden for two weeks. Bad or future values count as not dismissed. */
export function isInstallDismissed(raw: string | null | undefined, now: number, snoozeMs = INSTALL_SNOOZE_MS): boolean {
  if (!raw) return false;
  const at = Number(raw);
  if (!Number.isFinite(at) || at <= 0 || at > now) return false;
  return now - at < snoozeMs;
}

export interface ShareInput {
  title: string;
  text?: string;
  url: string;
}

export function buildShareData(input: ShareInput): { title: string; text?: string; url: string } {
  const title = input.title.trim() || 'Identity Prism';
  const text = input.text?.trim();
  return text ? { title, text, url: input.url } : { title, url: input.url };
}

/** Real count only: non-numbers, zero and negatives clear the badge (null). */
export function normalizeBadgeCount(n: unknown): number | null {
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  const v = Math.floor(n);
  return v > 0 ? Math.min(v, 99999) : null;
}

/** Vibration patterns in ms. Kept short so they feel like taps, not alerts. */
export const HAPTIC_PATTERNS = {
  tap: 10,
  success: [12, 40, 12],
  warning: [30, 60, 30],
} as const;
export type HapticKind = keyof typeof HAPTIC_PATTERNS;
