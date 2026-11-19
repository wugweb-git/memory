# Cross-cutting accessibility and mobile audit

Date: 2026-11-19. Branch: `worktree-agent-a8db77f03714ba014` (HEAD 405b388 plus this file). Read-only audit; no `src/` file was changed.

## How this was measured

- Local `next dev -p 3105`, dummy env (no real DB), owner session forged with the dev JWT fallback so private routes render. Browser tab driven through the Browser tools.
- Routes: all 21 internal pages from `find src/app -name page.tsx` (`/` redirects to `/p/system_user`; `/p/[username]` tested as `/p/demo`) plus `/login` (signed out) and `/offline`.
- Viewports: 375x812 (full probe on every route), 320x700 (every route), 768x1024 (first 11 routes; the pane reset to 1024 for the rest, those are recorded at 1024), 320x256 (the 400% zoom equivalent, 5 routes), root font-size 200% at 375x812 (8 routes), prefers-color-scheme dark (1 route), reduced motion (read from CSS, the Browser tool cannot emulate it).
- Probe per route (script kept out of the repo): scroll width with `overflow-x` masks lifted, off-screen elements, clipped/ellipsised text, text-on-text overlap, fixed/sticky bars and whether the last content or any focused control is hidden by them, target sizes, font sizes, contrast of every text node (canvas-normalised colours, alpha and ancestor opacity composited over the effective background), UI-component boundaries, heading outline, landmarks, skip link, accessible names, labels, `alt`, live regions, duplicate ids, viewport meta, lang, title.
- Keyboard: real Tab presses on `/system` (shell), DOM-derived tab order on every route, Escape on the account menu.

Limits you should know about:
- Dummy DB means most data pages sit in skeleton or error state. Long real content (wrapping tables, long titles) is not covered. Re-run on the real pull before sign-off.
- `/p/*` renders only a loading state locally (0 interactive targets), so the public profile body is untested.
- The Next dev "N" badge overlaps the dock in screenshots. It is dev-only and ignored.
- `window.focus()` does not trigger `:focus-visible`, so a scripted "no ring" count (up to 26 per page) is a probe artefact. Rings were judged from real Tab presses.
- The shared Browser pane reset my viewport emulation several times (other agents share it); every figure below was taken with the `vw` reported by the probe confirmed.

## Top 15 findings (ranked)

| # | Sev | Scope | Where | Measured | WCAG | Fix | Likely owner |
|---|-----|-------|-------|----------|------|-----|--------------|
| 1 | High | All 20 shell routes | Bottom dock at 200% text | Pill is `w-16` = 128px at 200%. 5 items span 17..657px in a 375px viewport; Content is clipped, Buffer and More are off-screen. More is the only way to reach every other route. Dock 162px tall + topbar 112px = 34% of an 812px viewport | 1.4.4, 1.4.10, 2.1.1 | Make dock items `min-w-0 flex-1`, use `min-w-[3rem]` pill with `px`, let labels wrap or switch to icon + tooltip above ~150% | `src/app/component/AppShell.tsx:384-420` |
| 2 | High | All shell routes | Fixed bars at 400% zoom (320x256) | Topbar 56px + dock 82px = 138px = 54% of the viewport, 118px left for content. `/ask`: header + composer cover about 77%, 58px of conversation visible | 1.4.10, 2.4.11 (partial: `/memory` file input 25% under the header) | At `max-height: 480px` make the dock static (in flow) or auto-hide on scroll; cap the ask composer height | `AppShell.tsx`, `globals.css` (`--dock-h`), `src/app/ask/page.tsx:505` |
| 3 | High | 8 routes, 13 fields | Form field boundary | `border-border-primary` = `rgba(0,0,0,.08)` gives 1.19:1 (`#ebebeb` on `#fff`) on `/login` (2), `/admin/profile` (3), `/content` (2), `/memory` (2), `/system` (1); 1.19:1 `#e2e2dd` on `/buffer`; `/cognitive` fill only, 1.09:1; `/ask` textarea no boundary at all, 1.0:1 | 1.4.11 | Introduce a form-control border token at 3:1 or more (for example `rgb(138 138 132)`, about 3.4:1 on white) and use it on `input`, `select`, `textarea` | `globals.css:14`, `tailwind.config.ts`, each page's input classes (a shared Input would stop the drift) |
| 4 | High | All routes | Focus ring | Tailwind `ring-2 ring-accent` = `#00aaff`: 2.56:1 on white, 2.34:1 on porcelain `#f5f5f0`. Seen on real Tab for topbar buttons, dock, switches. Only the skip link has a black outline | 1.4.11, 2.4.13 (AAA) | Ring in `text-primary` with a 2px offset, or keep blue and add a 1px dark inner ring (two-tone) | `globals.css` focus block (~L310-320), every `focus-visible:ring-accent` |
| 5 | Medium | `/admin`, `/career`, `/portfolio`, `/admin/memory/public` | Accent as text colour | `#00aaff` on `#fff` 2.56:1 ("Refresh health checks" 13px, 5 nodes); on `#f5f5f0` 2.34:1 ("Back to admin" 14px, 2 nodes). 7 failing text nodes out of 19 distinct pairs; all other pairs pass | 1.4.3 | Keep the blue for fills (owner decision) but add a text variant, for example the previously used `0 111 175` (about 5.2:1) | `globals.css` tokens, those pages' `text-accent` |
| 6 | Medium | `/admin/profile` | Page header actions at 320px | "Preview profile" + "Save profile" row ends at x=334 in a 320px viewport; layout viewport grows to 334 (14px horizontal scroll). At 200% text the viewport grows to 638px | 1.4.10 | `flex-wrap` the action row or drop the Preview label to an icon below 360px | `src/app/admin/profile/page.tsx` (header row, `min-h-14 flex justify-between`) |
| 7 | Medium | `/buffer`, `/career` at 200% text | Header action rows | Layout viewport 402px (`div.flex w-full gap-3 sm:w-auto` 570px wide) and 425px (`flex-wrap` pill row inside `px-4 py-2 rounded-full`) | 1.4.10 | Allow wrapping, `min-w-0`, drop fixed `h-11 w-11` rem sizes for `min-h-11` | `src/app/buffer/page.tsx`, `src/app/career/page.tsx` |
| 8 | Medium | `/system` | Module switch | Thumb sits at x=340..360 while the track is 298..342 (18px outside, `left:auto` resolves to 21px). On and off both look broken; state is only colour plus the aria state | 1.4.1, 4.1.2 | Add `left-0` to the thumb span | `src/app/system/page.tsx:127` |
| 9 | Medium | All shell routes at 320px | Dock "More" item | `li` 265..329 in a 320px nav (`ul` scrollWidth 328, scrollable clip). 9px of the target is off-screen | 1.4.10, 2.5.8 | `min-w-0` on `li`, `px-1` on `ul`, narrower pill | `AppShell.tsx:384-415` |
| 10 | Medium | All shell routes at 200% | Topbar page title | Title `p.truncate` shrinks to w=50 (`/admin/profile`) or disappears (`/console` screenshot at 200%); the only visible page identity in the bar | 1.4.4, 2.4.6 | Let the title wrap to two lines or reserve `min-w-[8ch]`; hide the home logo link at narrow+large text | `AppShell.tsx:277` |
| 11 | Low | `/admin/memory/public` | "Back to admin" link | 94x17px, not inline | 2.5.8 (24px) and the 44px house rule | `min-h-11 inline-flex items-center` | `src/app/admin/memory/public/page.tsx` |
| 12 | Low | All | `color-scheme` not declared | App is light-only but `html` computes `color-scheme: normal`; with OS dark the scrollbar and native pickers render dark on porcelain (seen in screenshot). Both `theme-color` entries are light, which is correct | best practice | `:root { color-scheme: light }` and `<meta name="color-scheme" content="light">` | `globals.css`, `src/app/layout.tsx` |
| 13 | Low | `/admin/memory` etc. | Loading state has no heading | At probe time `/admin/memory` has 0 headings (h1 "Memory control surface" appears after data); skeleton-only states on other pages lack a live region saying "loading" | 1.3.1, 4.1.3 | Render the h1 outside the data branch | `src/app/admin/memory/page.tsx:39` |
| 14 | Low | `/p/[username]` | Title not unique per profile | "Public profile \| Identity Prism" for every username | 2.4.2 (passes), 2.4.6 | `generateMetadata` using the display name | `src/app/p/[username]` layout |
| 15 | Low | `/ask`, `/more` | Truncated essential text at 320px | Header "Vedanshu Srivas…" (ellipsis), `span.truncate` descriptions 242/237px | 1.4.10 | `line-clamp-2` instead of `truncate` for names | `src/app/ask/page.tsx`, `src/app/more/page.tsx` |

## Findings by shared component vs page

### Shared components

| Sev | Component | Finding | Criterion |
|-----|-----------|---------|-----------|
| High | `AppShell` dock | 200% text pushes Buffer/More off-screen (#1); 320px More overhang (#9) | 1.4.4, 1.4.10 |
| High | `AppShell` + `globals.css` | 54% of a 320x256 viewport is fixed chrome (#2) | 1.4.10, 2.4.11 |
| High | `globals.css` tokens | Border token 1.19:1 (#3); accent focus ring 2.3-2.6:1 (#4); accent text (#5) | 1.4.11, 1.4.3 |
| Medium | `AppShell` topbar | Title vanishes at 200% (#10) | 1.4.4 |
| Low | `layout.tsx` / `globals.css` | No `color-scheme` (#12) | n/a |

### Pages

| Sev | Route | Finding | Criterion |
|-----|-------|---------|-----------|
| Medium | `/admin/profile` | 14px overflow at 320, 263px at 200% (#6) | 1.4.10 |
| Medium | `/buffer`, `/career` | 200% text overflow (#7) | 1.4.10 |
| Medium | `/system` | Switch thumb outside track (#8) | 1.4.1 |
| Low | `/admin/memory/public` | 17px tall link (#11) | 2.5.8 |
| Low | `/admin/memory` | No heading in loading state (#13) | 1.3.1 |
| Low | `/p/*` | Same title for every profile (#14) | 2.4.6 |
| Low | `/ask`, `/more` | Ellipsis on names (#15) | 1.4.10 |

## Counts per criterion

| Criterion | Findings | Instances measured |
|-----------|----------|--------------------|
| 1.4.11 Non-text contrast | 2 (field borders, focus ring) | 13 fields on 8 routes; focus ring on every control |
| 1.4.10 Reflow | 5 (#2, #6, #7, #9, #15) | `/admin/profile` at 320; `/admin/profile`, `/buffer`, `/career` at 200%; dock at 320 and 200% |
| 1.4.4 Resize text | 2 (#1, #10) | 20 shell routes |
| 1.4.3 Contrast (text) | 1 (#5) | 7 text nodes, 2 distinct pairs of 19 |
| 2.4.11 Focus not obscured | 1 partial (#2) | 1 control, 25% covered, at 320x256 only; 0 at 375, 320x700, 768, 1024 |
| 2.5.8 Target size | 2 (#9, #11) | 1 target under 24px; 3 under 44px in total across 22 routes |
| 1.4.1 Use of colour | 1 (#8) | 1 switch pattern, 12 instances on `/system` |
| 1.3.1 / 4.1.3 | 1 (#13) | 1 route |
| 2.4.2 / 2.4.6 | 2 (#10, #14) | all `/p/*` |

## What works (with measured values)

- No horizontal overflow at 375 (0px on all 22 routes) and at 320x700 except `/admin/profile` (and the dock overhang). 768 and 1024: 0px on every route tested. The `overflow-x: hidden` mask on html/body was lifted for the measurement, so this is not hiding anything.
- Text contrast: 17 of 19 distinct text/background pairs pass. Body `#5a5a54` on `#f5f5f0` 6.35:1, on `#fff` 6.94:1, on `#edede8` 5.91:1; primary `#0a0a0a` on `#f5f5f0` 18.1:1; secondary `#2d2d2a` on `#f5f5f0` 12.63:1; success `#046c4e` on `#f3f3ee` 5.78:1; danger `#be123c` on `#fff` 6.29:1; reversed `#f5f5f0` on `#046c4e` 5.89:1.
- No text under 12px on any route (smallest measured 12px). No icon-only control without a name (0 unnamed buttons/links on 22 routes), 0 unlabelled form fields, 0 `<img>` without an `alt` attribute, 0 duplicate ids.
- Tap targets: 0 under 24px except one link; 3 under 44px in total. Dock items 64x80, topbar buttons 44x44, switches 44x44, primary buttons `min-h-11`/`min-h-12`.
- One `h1` on every page that rendered content, no skipped heading levels on any route. Titles are unique per route and use the `%s | Identity Prism` template (22 titles, only the `/p/*` pair repeats).
- Landmarks: one `main` on every route; named navs ("Primary", "Quick navigation"); `/offline` and `/login` have `main`.
- Skip link: first focusable element on shell routes, target `#main-content` exists with `tabindex="-1"`, shows with a black 2px outline plus accent halo and sits above the topbar (`z-100` over `z-30`), so it is not obscured.
- Real Tab sequence on `/system` at 375: skip link, home, public profile (eye), account menu, then content controls; dock is last in DOM order (after content), matching visual reading order. Other routes (DOM-derived): `/memory` skip, home, eye, account, filter inputs, file input, dock (5). `/login`: email, password, show password, remember me, sign in.
- Escape: account menu is a disclosure (`aria-expanded`, `aria-controls="account-menu"`), Escape closes it and returns focus to the button. `ConfirmDialog` has `aria-modal`, a focus trap, Escape and focus return (code read).
- Fixed bars: 0 of 22 routes have last content hidden by the dock at 375 and 320x700; 0 focus-obscured controls at 375, 320x700, 768, 1024. `scroll-padding` is 64px top and 112px bottom.
- Safe areas: dock `pb-[env(safe-area-inset-bottom)]` plus left/right insets; content padding adds `env(safe-area-inset-bottom)`; viewport has `viewport-fit=cover`.
- Viewport meta `width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content`; zoom is not disabled. `lang="en"`.
- Reduced motion: global `@media (prefers-reduced-motion: reduce)` clamps animation and transition durations to 0.01ms, sets `.animate-pulse/.animate-spin` to none, and `page-enter` only runs under `no-preference`. (Read from CSS; not emulated in the browser. Note that `.animate-spin` loaders then have no motion cue; keep their text.)
- Live regions: polite status containers on every shell page (toast container, capture sync, connectivity), `role="log"` on `/ask`; login uses status/alert.
- Offline page: `h1` "You are offline", explanatory paragraph, one 44px "Retry connection" button, `main` landmark, no content shift at 320 or 375, contrast 18:1 and 6.9:1.
- Dark scheme: app intentionally stays light (`data-theme="light"`); main text colour is unchanged at `prefers-color-scheme: dark`, so nothing becomes unreadable.

## Caveats and next checks

1. Re-run the 200% and 320px sweeps with real data loaded; skeleton states understate overflow risk on `/buffer` tables, `/history` rows and `/integrations` cards.
2. `/p/*` public profile and the signed-in `/ask` streaming states were not exercised.
3. A device pass is still needed for the keyboard covering fixed bars (`interactive-widget=resizes-content`) and for iOS safe areas.
4. Contrast for hover/disabled/active and for text over images was not measured (no background images found on tested states).
