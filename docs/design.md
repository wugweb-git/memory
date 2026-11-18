# Design

Identity Prism UI is **mobile-first, light-first**, action-prioritized, and output-driven.

> Note: earlier revisions of this doc said "dark-first." That is obsolete — the
> product is light-first (porcelain/earthy light theme). `/memory` and `/buffer` have since been rethemed to light.

## Principles
- Decisions over dashboards
- Outputs over analytics noise
- Minimal friction interactions
- One primary action per screen
- Explainability over opacity

## Design system (current)
- **Theme:** light, token-driven. Colors come from CSS variables in
  `src/app/globals.css` (`--bg-*`, `--text-*`, `--border-*`, `--accent`, semantic
  `--success/--danger/--warning`) and are exposed to Tailwind in `tailwind.config.ts`.
  No hardcoded hex in components — use the tokens.
- **Type scale:** one continuous fluid ramp (`2xs → 5xl`) defined in `globals.css`
  and mapped in Tailwind. No arbitrary `text-[Npx]`; 11px floor for readability.
- **Headings:** sentence case, no italics, no all-caps. Small uppercase eyebrow
  labels (e.g. nav group titles) are the only intentional uppercase.
- **Shell:** one route-aware `AppShell` (grouped sidebar + top bar + mobile drawer +
  bottom dock) drives every internal route. Public profile (`/p/*`) is the only
  surface outside the shell.
- **Surfaces:** `glass-panel` cards, `rounded-radius-xl`, `border-border-secondary`.

## Known debt (2026-11-18)
- `M3Button` and `M3Card` still use all-caps labels and `bg-black`, which break the sentence-case and token rules above. Tracked as TSK-013.

## PWA
- The app is installable: `public/manifest.json` (`start_url` `/console`, standalone), `public/sw.js`, offline page at `/offline`,
  icons from `scripts/generate-pwa-icons.py`. Theme and background colour match the light porcelain surface.
- Mobile baseline (globals.css): focus-visible ring, 16px form controls on phones, 44px touch targets on coarse pointers, reduced-motion/transparency, `min-h-dvh-fallback` for full-height pages. `src/lib/pwa/*` holds feature-detected helpers (share, haptics, badge); `InstallPrompt` and `ConnectivityToast` mount in the root layout (install prompt private pages only). Service worker v2: static assets cache-first (`/_next/static`) or stale-while-revalidate; HTML and `/api/*` are never cached.

## /ask (public digital-twin chat)
- Public, no login. Full-screen chat modelled on a messaging app: one fixed `100dvh` column (header, scrolling log, composer). `visualViewport` height keeps the composer above the keyboard in the installed PWA; the composer pads for `env(safe-area-inset-bottom)`.
- Rendered without `PublicFrame`. The only link out is the back arrow to `/p/<HANDLE>`; no private routes.
- Header: back arrow, avatar (`avatarFallbackUrl`, initials fallback), display name, third-person scope line, overflow menu with "Clear chat" (native `<dialog>` confirmation).
- Starter questions live in the `STARTER_QUESTIONS` const at the top of `src/app/ask/page.tsx`. Tapping one sends it. The owner reviews the wording.
- Messages: plain bubbles, no avatars, visitor right and twin left, max width 85%. Timestamps are captured when a message first appears (`createTimestampStore`), not at render.
- Composer: one row, grows to four lines, 16px text, 44px Send (becomes Stop while streaming). Enter sends on pointer devices and inserts a newline on touch devices.
- Errors show "Could not get an answer. Try again." with Retry; the input stays usable. The log auto-scrolls only when the reader is near the bottom.
- Pure helpers and tests: `src/lib/chat/ask-helpers.ts`, `test/user-flows/ask-helpers.test.ts`.
- No glass, blur, scanlines or highlight effects. Disclosure line sits under the composer.
