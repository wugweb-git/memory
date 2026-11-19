# Native device bridge

The product is PWA-first. This bridge uses real web platform APIs with feature detection and a fallback for every action, and it is built as an adapter so the same buttons later work inside a Capacitor Android shell. It has not been verified on a physical Android device; every support level below comes from platform documentation, not from a test run.

## Architecture

```
UI (src/components/native/*)  ->  getNative()  ->  web adapter (installed PWA)
                                               \->  Capacitor adapter (native shell, plugins lazily imported)
pure logic (src/lib/native/*.ts)  <- unit tested in test/hardening/native-*.test.ts
```

- `src/lib/native/adapter/types.ts` defines one interface per capability: calendar, contacts, location, camera, files, apps, share, notifications.
- `getNative()` returns the Capacitor adapter when `window.Capacitor.isNativePlatform()` is true, otherwise the web adapter. Each Capacitor method falls back to the web implementation when its plugin is missing or throws.
- Capacitor is **not** a dependency. Plugins load through `capacitor-shim.ts` (typed minimal shapes, memoised, returns null on failure). `capacitor-importers.ts` is the single file to edit when the shell is added; it contains the exact `import()` lines.
- UI components call only the adapter. A few single-purpose web helpers (clipboard, wake lock, speech, NFC, storage estimate) live in `src/lib/native/browser.ts` and are used by the capabilities panel and storage status.

### Adapter table

| Capability | Web implementation | Capacitor plugin | What only the shell unlocks |
|---|---|---|---|
| Calendar | `.ics` download or share file, Google Calendar template link | `@capacitor-community/calendar` | Native event editor, reading existing events |
| Contacts | Contact Picker API (Android Chrome) | `@capacitor-community/contacts` | Full contact list read, iOS support |
| Location | `navigator.geolocation` one fix, Permissions API state | `@capacitor/geolocation` | Background and continuous tracking (needs a background-geolocation plugin and foreground service) |
| Camera | `<input capture>` system camera, canvas downscale | `@capacitor/camera` | Consistent permission UX, gallery and camera sources |
| Files | `showOpenFilePicker` (non-Android), `<input type=file>` (Android document picker, includes Drive), `showSaveFilePicker` or Blob download | `@capacitor/filesystem` | Writing to Documents, large file access |
| Apps | Chrome `intent://` URLs and https App Links with `browser_fallback_url`; install state unknown | `@capacitor/app-launcher` (`canOpenUrl`, `openUrl`) | Real "is installed" checks (Android 11+ needs `<queries>` entries in the manifest) |
| Share | `navigator.share` with files, copy fallback | `@capacitor/share` | Sharing files by native URI |
| Notifications | `Notification` + service worker (push is in `src/lib/push`) | `@capacitor/local-notifications` | Scheduled and exact-time local reminders |

## Share target (other apps share into this app)

`public/manifest.json` declares `share_target` (POST, multipart: title, text, url, files `.txt .md .ics`, images, PDF).

1. Android share sheet posts to `/share-target`.
2. The service worker (`public/sw.js`, VERSION v5) intercepts the POST, parks the content in the Cache API (`share-inbox-v1`, one-shot id) and redirects 303 to `/share-target/review?share=<id>`. This works offline.
3. Without a controlling worker, `src/app/share-target/route.ts` handles the POST, carries text, title and URL as query parameters and redirects to the same page (files need the worker).
4. The review page lets the user edit and confirm, then calls `captureToBuffer()` (the existing offline capture queue, `/api/blob`) with `type` `shared_note`, `shared_link`, `shared_text_file` or `shared_calendar_file`. Images and PDFs are accepted by Android but are skipped with a visible message; the blob intake has no binary path yet.

Link recovery: Android Chrome usually puts the shared URL in `text`; `normalizeSharedFields` extracts it and keeps only http(s) links.

Other manifest additions: `shortcuts` (Capture note, Ask, Buffer, Dashboard), `file_handlers` (desktop Chromium only), `protocol_handlers` for `web+prism`, existing `id`, `categories`, `display_override`, `launch_handler`.

## Capabilities (Android Chrome support level)

Levels: Supported, Partial, Chromium-only, Not possible from a PWA. The live version of this table, with "Try" buttons, is `CapabilitiesPanel`. The source rows are `src/lib/native/capability-table.ts`.

| Capability | Level | Notes |
|---|---|---|
| Share sheet / share files | Supported | Falls back to copy |
| Clipboard write | Supported | User gesture; `execCommand` fallback |
| Clipboard read | Partial | Only on tap; paste prompt |
| Contact picker | Chromium-only | User picks; no silent reads |
| Location (one fix) | Supported | Foreground only |
| Camera (capture attribute, getUserMedia) | Supported | Downscaled to 1600 px before upload |
| Wake lock | Supported | Re-acquired on foreground |
| Vibration | Chromium-only | Reuses `haptic()` |
| App badge | Partial | Reuses `setAppBadge()` |
| Local notifications | Supported | Remote push: `src/lib/push`, not duplicated here |
| Background Sync | Chromium-only | Already used for the capture queue |
| Periodic Background Sync | Chromium-only | Needs high engagement; not guaranteed, not used |
| Speech recognition | Partial | Chrome sends audio to a server; `VoiceIngestion.tsx` already uses it |
| Speech synthesis (read aloud) | Supported | `speakableText()` strips markdown and URLs |
| Web NFC | Chromium-only | Android Chrome 89+, tap to scan |
| Web Bluetooth / Web USB | Chromium-only | User picks the device; detection only |
| Media Session | Supported | Lock-screen controls while media plays |
| Picture in picture | Partial | Video elements only |
| Screen capture (getDisplayMedia) | Not possible from a PWA | Not exposed by Android Chrome; helper returns null |
| Network Information | Chromium-only | Online state, effective type, save-data |
| Battery status | Partial | Chrome only; may be removed |
| Device orientation / motion | Supported | Opt-in only |
| Fullscreen | Supported | Needs a gesture |
| Payment Request | Partial | Documented only; no payments are built |
| WebAuthn passkeys | Supported | Already used: `src/lib/passkey-client.ts` |
| Credential Management | Supported | `navigator.credentials` |
| Idle Detection | Chromium-only | Permission prompt, 60 s floor |
| File Handling / launchQueue | Not possible from a PWA | Desktop Chromium only; use the share target on Android |
| Launch handler | Partial | `navigator-existing` already set |
| `web+` protocol handlers | Partial | Limited on Android |
| File System Access | Partial | Save picker with download fallback |
| Origin private file system | Supported | Large private offline files |
| Storage estimate / persist | Supported / Partial | Persist is granted heuristically (installed or engaged sites) |
| Installed related apps | Partial | Reports only apps related in the manifest; it cannot list installed apps |

## Calendar

A web app cannot reach `content://com.android.calendar`. The bridge generates an RFC 5545 file (`src/lib/native/ics.ts`: CRLF, escaped text, 75-octet folding that never splits a code point, UTC `DTSTART`/`DTEND`, `DTSTAMP`, stable `UID`, optional `VALARM`, all-day via `VALUE=DATE`). On Android Chrome the downloaded `.ics` opens in Calendar from the download notification; the share sheet and a Google Calendar template link are the alternatives. Importing `.ics` is supported through the share target and `parseIcs`.

## Location

One fix on a tap (10 s timeout, high accuracy opt-in), with the Permissions API state shown as Allowed, Will ask or Blocked. The place (lat, lon, accuracy, timestamp, Maps link, geo URI) is added under `raw_payload.place` and `trace_json.place` by `attachPlaceToBody`; old payloads and queue replays are unchanged. "Open in Maps" uses `geo:` with an https fallback, and "Share my location" uses Web Share. Background or continuous location tracking is not possible from a PWA; it needs a native wrapper with a foreground service.

## Open in app

`src/lib/native/apps.ts` builds Chrome Android intent URLs:

```
intent:DATA#Intent;scheme=SCHEME;package=PKG;S.browser_fallback_url=ENCODED_WEB_URL;end
```

Every launcher has a web fallback, so a missing app opens the website. Covered: WhatsApp, Telegram, Signal, Gmail (compose, search, mailto), Outlook, Spotify (track/album/artist/playlist, search, open), YouTube, Google Maps, Waze, Uber, Google Calendar, Drive, Keep, Tasks, Photos, Meet, Zoom, Slack, Discord, Teams, Notion, LinkedIn, X, Instagram, Facebook, Dropbox, OneDrive, Pocket, Trello, Todoist, Chrome, PhonePe and Google Pay (open only; no payment parameters are ever built).

- A PWA cannot list installed apps or detect which are present. `navigator.getInstalledRelatedApps` only reports the site's own related apps. Launch is best effort with a fallback.
- Full installed-app access (package list, usage stats) needs a native wrapper (Capacitor plugin or Kotlin) with `QUERY_ALL_PACKAGES`, which Google Play restricts. The Capacitor adapter's `apps.isInstalled` uses `canOpenUrl` instead, which only needs `<queries>` entries.
- There is no working web intent for the system Camera or Photos picker; the camera path is the `capture` input.
- Spotify: launchers open URIs and `open.spotify.com` links only. Playback control and listening history go through the server-side connector `src/lib/connectors/spotify.ts` (needs the credentials page), not the web.
- Google Drive: Open in Drive links and intents only. "Pick from Drive" is the system document picker (`<input type=file>`), which on Android lists Drive. Reading the Drive library goes through the existing Google Drive connector (server-side OAuth); the web cannot silently browse Drive.

## Ask another AI (handoff)

`AskAnotherAi` opens ChatGPT (`com.openai.chatgpt`), Claude (`com.anthropic.claude`), Gemini (`com.google.android.apps.bard`), Perplexity (`ai.perplexity.app.android`) and Copilot (`com.microsoft.copilot`) by intent, with a web fallback that prefills the prompt where the site supports it (Gemini does not). Rules:

- Sent only on an explicit tap. The exact text is shown first under "Will send", truncated at 4000 characters.
- It is a handoff, not a live session. The app cannot listen to or learn from conversations inside other apps unless the user shares or pastes them in.
- Return path: (1) the Android share sheet from the AI app into `/share-target` becomes a capture; (2) "Paste from clipboard" reads the clipboard on tap and captures it.
- Continuous voice conversation with the in-app assistant uses the existing `/ask` plus Web Speech.

## Storage

`StorageStatus` shows `navigator.storage.estimate()`, the persistence state and a "Protect offline data" button (`persist()` is granted heuristically). `captureToBuffer` now throws `StorageFullError` (name `QuotaExceededError`) when the IndexedDB queue is full; the device actions turn it into a "storage full" message instead of losing the capture silently. OPFS and the File System Access API are Chromium-only; exports fall back to a Blob download.

## Not possible from a PWA

| Need | What it takes |
|---|---|
| Read the device calendar silently | Capacitor `@capacitor-community/calendar` (READ_CALENDAR) |
| Read contacts silently | Capacitor `@capacitor-community/contacts` (READ_CONTACTS) |
| Read SMS or the call log | Kotlin plugin; Google Play restricts these permissions |
| List installed apps, usage stats | Kotlin plugin (QUERY_ALL_PACKAGES, PACKAGE_USAGE_STATS), Play restricted |
| Background or continuous location | Background-geolocation plugin with a foreground service |
| Accessibility services, home-screen widgets, default-app registration | Native Kotlin |

## Recommended next step

1. **Trusted Web Activity via Bubblewrap** for a Play Store build. It is the PWA in a full-screen Chrome shell: no new native capability, but a store listing, deep-link verification and a real app icon.
2. **Capacitor only if native calendar read/write, contacts or installed-app checks are required.** Add the plugin packages, fill in `capacitor-importers.ts`, and the same components use them with no UI change.

Capacitor packages to install then: `@capacitor/core`, `@capacitor/android`, `@capacitor/geolocation`, `@capacitor/camera`, `@capacitor/filesystem`, `@capacitor/share`, `@capacitor/app-launcher`, `@capacitor/local-notifications`, `@capacitor-community/calendar`, `@capacitor-community/contacts`. Verify the plugin method shapes in `capacitor-shim.ts` against the installed versions.

### Owner steps for a TWA

1. `npm i -g @bubblewrap/cli`, then `bubblewrap init --manifest https://www.vedanshusrivastava.com/manifest.json` and `bubblewrap build`.
2. Generate or reuse an Android signing key and keep it safe (Play App Signing recommended).
3. Get the SHA-256 certificate fingerprint (`bubblewrap fingerprint` or from the Play Console).
4. Publish `https://www.vedanshusrivastava.com/.well-known/assetlinks.json` (owner-supplied; not in this repo) with `relation: ["delegate_permission/common.handle_all_urls"]`, your package name and the fingerprint. Serve it as `application/json` with no redirect and make sure the auth middleware does not intercept `/.well-known/` (it currently would, so it needs a public-route entry in `src/lib/security/route-access.ts` when you add the file).
5. Create the Play Console listing and upload the AAB; set the privacy policy and data safety form.
6. Test on a device: the app must open without the browser URL bar. A missing or wrong `assetlinks.json` shows the bar.

## Where to mount the components

All in `src/components/native/`. Not yet mounted (the pages are being redesigned elsewhere):

- Buffer page, capture tools: `DeviceActionsRow`, `CameraCaptureButton`, `PasteCaptureButton`, `AskAnotherAi`.
- Memory and content item actions: `ShareButton`, `AddToCalendarButton`, `OpenInApp` (pass `context` with the item's title, text and url), `AskAnotherAi` (pass the item text as `context`).
- System page: `StorageStatus` and `CapabilitiesPanel`.
