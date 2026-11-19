# Mobile, PWA and accessibility notes

## PWA update flow
- `public/sw.js` has a `VERSION` constant (cache name `prism-static-<VERSION>`). Bump it whenever the precache list or caching strategy changes; old `prism-*` caches are deleted on activate.
- The worker never calls `skipWaiting()` on its own. A new worker installs and waits.
- `src/app/component/ServiceWorkerRegister.tsx` detects the waiting worker (on load and on `updatefound`) and shows an accessible "new version" prompt. Accepting posts `{ type: 'SKIP_WAITING' }`; the page reloads once on `controllerchange`.
- It also calls `registration.update()` when the app returns to the foreground, so installed PWAs pick up releases without a cold start.
- Deploys are manual-promote on Vercel: the update prompt only appears after the new build is promoted.

## Colour tokens
- All colours are CSS variables in `src/app/globals.css`, exposed to Tailwind in `tailwind.config.ts`.
- Each colour exists twice: a hex var (`--text-tertiary: #5A5A54`) and an RGB-channel var (`--text-tertiary-rgb: 90 90 84`). Tailwind uses the `-rgb` var so opacity modifiers (`text-text-tertiary/60`) work. **When you change a colour, edit both the hex var and the matching `--*-rgb` var**, or the two drift apart.
- Text on `bg-bg-*` surfaces must keep 4.5:1 (3:1 for large text and icons). `text-text-disabled` is about 4.1:1 on `bg-tertiary`, so use it only for icons and genuinely disabled controls; use `text-text-tertiary` for any readable text, placeholders and captions.
- Do not stack `opacity-40/60` on text; it drops it below AA.

## Forms and controls conventions
- Every input has a programmatic label (`<label htmlFor>`, `aria-label` or `sr-only` label); placeholders are not labels.
- Required fields: `required` plus `aria-required="true"`. Errors: `aria-invalid`, `aria-describedby` pointing at the message, and `role="alert"` on the message.
- Switches use `role="switch"` and `aria-checked`. Filter and view toggles use `aria-pressed` inside a `role="group"` with a label. The cognitive tools use real tab roles with roving tabindex and Arrow/Home/End keys.
- Login uses `autocomplete="username webauthn"` and `current-password`.
- Toasts go through `src/app/component/AppToastContainer.tsx` (polite `role="status"`, 6 s, pause on hover and focus loss). Use it instead of `ToastContainer` directly.

## Share image
`public/og-image.png` (1200x630) is referenced by `openGraph` and `twitter` metadata in `src/app/layout.tsx`.

## Manual device test checklist
Run on a real phone with the production build (service workers do not run under `next dev`).
- [ ] Install to the home screen (Android Chrome and iOS Safari); icon, name and splash look right; the manifest screenshots show in the Android install sheet.
- [ ] Launch standalone: status bar colour matches the porcelain surface; content respects the notch and home indicator (safe-area insets).
- [ ] Rotate portrait and landscape; no horizontal scroll at 320 px width.
- [ ] Open a form field: the keyboard does not cover the focused input or the sticky Save bar; the right keyboard appears (email, url).
- [ ] Offline: enable airplane mode, reload; the offline state and connectivity toast appear; capture queue shows pending items, and they sync after reconnect.
- [ ] Update flow: deploy and promote a new build, reopen the app; the "new version" prompt appears, Update reloads once, no loop.
- [ ] Screen reader (VoiceOver and TalkBack): skip link is first; drawer opens and traps focus, Escape or Close returns focus to the menu button; toggles announce on/off; errors are read when they appear; cognitive tabs move with arrow keys.
- [ ] Keyboard only (external keyboard): every control is reachable, focus ring is visible, no focus traps.
- [ ] Zoom text to 200% and enable reduced motion; layout holds and animations stop.
- [ ] Share the site URL in a chat app; the preview shows the Identity Prism image.

## WCAG 2.2 AA audit checklist
Re-run when adding a route or shared component. Status = verified in code on this branch ([x]) or needs a device/browser pass ([ ]).
- [x] **2.4.2 Page titled**: root `metadata.title` is `{ default, template: '%s | Identity Prism' }`; every route segment has a server `layout.tsx` exporting `metadata.title` (client pages cannot export metadata). New route = new `layout.tsx`. `offline` sets its own title.
- [x] **2.4.11 Focus not obscured**: `scroll-padding` on `html` and `scroll-margin` on `:focus-visible` clear the fixed topbar (3.5rem + safe area) and bottom dock.
- [ ] **1.4.10 Reflow**: no fixed widths found; wide tables sit in `overflow-x-auto` (buffer table fixed). Confirm at 320 px on a device; `html, body { overflow-x: hidden }` can mask overflow, so check with it disabled.
- [x] **1.4.12 Text spacing**: no fixed-height containers clip text (fixed heights only on scroll regions); failed-item reasons wrap instead of truncating.
- [x] **1.4.13 Content on hover/focus**: no hover-only `title=` disclosure left on data (integrations sync metrics are now visible text). Remaining `title=` props are component props, not tooltips, except `ThemeToggle` (informational).
- [x] **2.5.7 Dragging movements**: no drag-only UI; the only drop zone (`MemoryVaultWithUpload`, unused) and `ManualUpload` also have click/file-picker paths.
- [x] **2.5.8 Target size**: 24 px floor for buttons/tabs/switches on all pointers; 44 px on coarse pointers; row actions use `min-h-11`.
- [x] **3.3.7 Redundant entry**: forms keep values after errors (login keeps the email).
- [x] **3.3.8 Accessible authentication**: login allows paste, uses `autocomplete="username webauthn"` / `current-password`, and offers a passkey path.
- [x] **3.2.3 / 3.2.4 Consistent navigation and identification**: one `AppShell` and one nav config (`ui-content.ts`) on every internal route; same labels for Sign in / Sign out / Menu. **3.2.6 Consistent help**: no repeated help mechanism exists; add it in the shell if one is introduced.
- [x] **4.1.3 Status messages**: async results use `role="status"` or `role="alert"` (toasts, login, CSV import, device capture, RAG tester, cognitive feedback).
- [x] **1.3.1 Headings**: one `h1` per page (`M3Page` or page header), no skipped levels (memory, admin/memory, buffer, career panels fixed).
- [x] **2.4.4 Link purpose**: icon-only links have `aria-label`; every `target="_blank"` link announces "(opens in a new tab)" and has `rel="noopener noreferrer"`.
- [x] **1.4.1 Use of colour**: integrations status dot has a text status for assistive tech plus the visible status line; job status badges carry label and icon.
- [x] **2.3.3 / reduced motion** and **forced colors**: `prefers-reduced-motion`, `prefers-reduced-transparency` and `forced-colors` (focus ring uses `Highlight`) handled in `globals.css`.
- Known gaps: `window.open(...)` buttons in `EnhancementHub` (unused component) do not announce a new tab; some pages still use `truncate` on single-line labels (title text, not essential data).

## Deployment status (2026-11-19)
Shipped to production in main bda0120/cdbe97d. Open: full 375px route sweep on the deployed build, /ask interaction checks (streaming, Stop, Retry, Copy). Blue accent kept at `0 170 255` by owner decision; blue text on the light background is below 4.5:1 (the design pass had darkened it to `0 111 175`).

## Update (2026-11-19, main b4ff0a3, promoted)
New page `/integrations/publishing` (owner-only credentials for X, LinkedIn, Facebook, Instagram, Medium). Needs a signed-in 375px check; labels use `<label for>`, errors use `role="alert"`, status uses icon plus text. Gmail and Spotify connectors added on `/integrations`.
