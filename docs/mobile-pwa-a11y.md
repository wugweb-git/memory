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
