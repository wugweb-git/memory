# Progressive web app

Prism OS installs as a standalone app and keeps working, in a limited way, without a connection.

## What exists

| Piece | File | Notes |
| --- | --- | --- |
| Manifest | `public/manifest.json` | `id` and `start_url` `/console`, scope `/`, standalone, 192 and 512 icons plus a separate maskable 512, three shortcuts (Dashboard, Ask, Memory). |
| Service worker | `public/sw.js` | `/_next/static` cache-first, icons and images stale-while-revalidate, page navigations network-first with the `/offline` fallback. Authenticated HTML and `/api/*` are never cached or intercepted. Registered in production only by `ServiceWorkerRegister`. |
| Install prompt | `src/app/component/InstallPrompt.tsx` | Private pages on phones only. Chromium uses `beforeinstallprompt`; iOS Safari gets Add to Home Screen steps. Dismissal is remembered for 14 days in `localStorage` (try/catch). |
| Browser helpers | `src/lib/pwa/browser.ts`, `helpers.ts` | `haptic`, `shareOrCopy`, `setAppBadge`, `isStandalone`, all feature-detected. `haptic` is silent under `prefers-reduced-motion`. |
| Passkeys | `/login` | Biometric sign-in after a first password sign-in. |
| Connectivity toast | `ConnectivityToast.tsx` | Polite live region for online and offline changes. |

## Offline capture queue

Captures sent to the intake endpoint (`POST /api/blob`) are queued when the device is offline or the request fails with a network error, then replayed.

- Pure logic: `src/lib/pwa/capture-queue.ts` (`enqueue`, `flush`, `captureOrQueue`, `classifyStatus`) with an injectable storage adapter. Tests: `test/hardening/capture-queue.test.ts`.
- IndexedDB adapter: `src/lib/pwa/capture-store.ts` (db `prism-captures`, store `queue`). Returns `null` when IndexedDB is unavailable; the capture then goes straight to the network and errors surface as before.
- Browser glue: `src/lib/pwa/capture-client.ts` (`captureToBuffer`, `flushCaptureQueue`). Sends with `credentials: 'include'`, so the session cookie is used.
- Replay paths:
  1. Background Sync: the page registers `prism-capture-sync`; `public/sw.js` replays the same IndexedDB records on the `sync` event (Chromium browsers; not Safari or Firefox).
  2. Fallback: `CaptureSyncStatus` (mounted in the root layout) flushes on the `online` event and when the app opens.
- Status: `CaptureSyncStatus` shows "Saved offline, will sync" while items are pending, and the app icon badge shows the pending count where the Badging API exists.
- Replay rules: oldest first; stops on a network error or a 401/403 (items are kept until you sign in again); 404, 405, 410, 413, 415 and 422 are dropped as they can never succeed; every other failure is retried up to 8 times. `/api/blob` answers 400 for any internal error, including a database outage, so a plain 400 is retried rather than dropped. The queue holds at most 200 items (oldest dropped first).
- Wired into: `VoiceIngestion` (buffer page) and `BlobBuffer`. `DeviceCapture` and `CsvImport` post to other endpoints and are not queued yet; pass `url` to `captureToBuffer` to queue them.
- Keep `PERMANENT` and `MAX_ATTEMPTS` in `public/sw.js` in step with `capture-queue.ts` (the worker cannot import TypeScript).

Haptics: sign-in success, capture saved, capture queued (warning pattern), install accepted, share link copied. Share uses `shareOrCopy` on the public profile.

## Layout rules for mobile

- `viewport-fit=cover`; the top bar, drawer and bottom dock add `env(safe-area-inset-*)` padding.
- Full-height surfaces use `dvh` (`min-h-dvh`, `h-dvh`).
- Nav and form controls are at least 44px (`min-h-11`).
- Rows of chips wrap instead of scrolling the page sideways; check 375px width.

## Web push: not implemented, owner steps

Web push needs a VAPID key pair that only the owner should generate and hold. Nothing in the app sends or subscribes to push yet. To add it later:

1. Generate keys once on your machine: `npx web-push generate-vapid-keys`.
2. Add to Vercel env (Production and Preview): `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (public key), `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` (a `mailto:` address you own). Never commit the private key.
3. `npm i web-push` and add a table for subscriptions (endpoint, p256dh, auth, user id) in `prisma/postgres/schema.prisma`, then migrate.
4. Add an owner-only route that stores a subscription from `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })`, and an owner-only route or job that calls `webpush.sendNotification`.
5. Add `push` and `notificationclick` handlers to `public/sw.js` and bump `VERSION`.
6. Ask for permission only from a button the owner taps, never on page load. On iOS, push works only after the app is installed to the Home Screen (iOS 16.4+).
7. Prune subscriptions that answer 404 or 410.
