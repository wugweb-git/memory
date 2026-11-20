# UX/UI foundation audit (shared shell and kit)

Scope: `globals.css`, `tailwind.config.ts`, `AppShell`, `src/components/ui/*`, nav config, plus the shared app components (toasts, install prompt, connectivity, capture status).
Method: dev server on :3101, 375x812 emulation, computed styles and bounding boxes via script, real Tab/Escape key presses for focus checks, contrast computed from the token hex values. Auth was a locally minted session cookie for the dev server only.
Standards: Material 3 (type roles, 56px app bar, 80px navigation bar, 48/44dp targets, state layers) and WCAG 2.2 AA. Constraints kept: no border-radius changes, cyan accent unchanged, token-only colours.
Things I could not verify: a real touch device and VoiceOver/TalkBack (script and keyboard only); the throttled background pane paused rAF so dialog enter animation was checked by behaviour, not by frames.

## 1. Findings with measurements

| # | Element | Measured before | Threshold | Fix |
|---|---|---|---|---|
| 1 | Top bar title | 16px / 600 (`text-base`) | M3 title-large 22px | `text-xl` = 22.25px; hidden while the page h1 is visible (no duplicate title), fades in after scroll |
| 2 | PageHeader h1 | 18.1px inside a bordered 24px-radius card, p-5, same words as the top bar | M3 headline 24px, no card-in-card | Flat header, `.type-headline` 22.25px (26px at md); description 14px |
| 3 | Bottom bar | 66px high, icon 18px, pill 48x28, label 11px | M3 80px, icon 24, pill 64x32, label 12 | `--dock-h` 5rem; measured 81px (80 + 1px border), icon 24, pill 64x32, label 12px, tonal pill |
| 4 | Bottom bar active state | black pill, white icon | state not by colour alone; blue accent kept | `bg-accent/25` pill + bold label + heavier stroke + `aria-current`; pressed/hover state layers |
| 5 | More list row | title 13px, hint 12px, row 56px | body 16 / 14 | `ListRow` title 16px, supporting 14px, 56px (72px with supporting) |
| 6 | Secondary UI text | `--font-sm` 13px | M3 body-medium 14 | `--font-sm` 0.875rem (affects every `text-sm`) |
| 7 | Button heights | default 40, sm 36, icon 40x40 (44 only on coarse pointers) | 44px (WCAG 2.5.5, M3 48dp) | default 44, sm 44 on phones (40 from md), lg 48, icon 44x44. Measured 44/44/48/44x44 |
| 8 | Input / select / textarea | 40px, text-sm | 44px, 16px text on phones | `min-h-control` 44px, 16px phones / 14px md+. Measured 44, 16px |
| 9 | Focus ring on components using `outline-none` + `ring-accent` | 2px `rgb(0,170,255)` = 2.34:1 on porcelain, 2.56:1 on white | 3:1 (1.4.11) | Global `:focus-visible` 2px `#0A0A0A` outline (18.1:1) + cyan halo, `!important` so component classes cannot remove it. Measured `rgb(10,10,10) solid 2px` |
| 10 | `Chip tone="accent"` | cyan text on cyan tint, about 2.3:1 | 4.5:1 | text-primary text (19.8:1), cyan kept in border and tint |
| 11 | Press feedback | `active:scale-[0.98]` on buttons only; none on rows, tabs, nav, icons | state layers (M3) | `.state-layer` (hover .08, focus .10, pressed .12) on Button, ListRow, tabs, chips, top bar icons |
| 12 | Document title on `/more` | `Identity Prism \| Neural OS` (no route layout) | 2.4.2 | Shell sets `More \| Identity Prism`, also after client navigation (observes `<title>`) |
| 13 | Sub-pages | no back affordance on phones | native pattern | Back arrow for 2+ segment routes and for More-only routes (goes back, or to parent / More) |
| 14 | Toast position | react-toastify default top-right: covers the top bar eye and account buttons at 375px | must not cover controls | `AppToastContainer` default `bottom-center` (existing CSS lifts it above the dock); top toasts sit below the 56px bar on phones |
| 15 | Toast dismiss button | 14px glyph | 24px min, 44 aim | `.Toastify__close-button` 44x44 (measured) |
| 16 | CaptureSyncStatus vs ConnectivityToast | both centred at top 60px / 64px, overlap when both show | no overlap | capture chip moved to 6.5rem |
| 17 | `.page-enter` | `animation-fill-mode: both` leaves a transform as the containing block for fixed descendants while the animation holds | none | `backwards` |
| 18 | Blue text across pages | 87 uses of `text-accent`: 2.56:1 on white, 2.34 porcelain, 1.93 clay | 4.5:1 | NOT changed (owner keeps the accent). Added opt-in `text-accent-ink` (`#0060A0`, 6.6:1 white, 6.0 porcelain, 5.0 clay). Page owners should switch blue text to it, or the owner decides to accept the exception |
| 19 | Disabled placeholder / disabled text | `text-disabled` 4.05:1 on clay | 4.5:1 for text | Placeholders now `text-tertiary` (5.2 to 6.9:1). `text-disabled` stays icon/disabled only |

Credit: top bar already 56px with 44px icon targets; skip link, landmarks (aside Sidebar, nav Primary, header, main, nav Quick navigation), focus-to-main on route change, safe-area insets, `prefers-reduced-motion` and `forced-colors` were already correct and untouched. Text tokens measure 5.2:1 or better on every surface (table in section 4).

Before/after at 375px: top bar 56 to 56, bar title 16 to 22.25px, dock 66 to 81, dock icon 18 to 24, label 11 to 12, button 40 to 44, input 40 to 44, page h1 18 to 22.25 (boxed to flat), list title 13 to 16, no horizontal overflow before or after (scrollWidth 375).

## 2. Functional audit

| Control | Expected | Observed | Status |
|---|---|---|---|
| Bottom bar: Console, Memory, Content, Buffer, More | Navigates, one `aria-current`, pill on active, focus lands on `main` | All five navigate; exactly one `aria-current=page`; pill matches; `document.activeElement` is `main-content` after each | OK |
| More active for More-only pages | More highlighted with sr note | `/cognitive`: More pill, sr text "(current page is in this section)", `aria-current` correctly absent | OK |
| Back from More child | Previous scroll restored | scrollY 300 before, 300 after `history.back()` | OK |
| Back arrow | Visible on drill-in pages | Missing for More-only top-level routes (`/cognitive`) | Fixed (arrow, goes back or to `/more`) |
| Document title on client navigation to `/more` | `More \| Identity Prism` | stayed `Identity Prism \| Neural OS` (Next applies default after effect) | Fixed (title observer) |
| Skip link | First focusable, targets `#main-content` | First focusable, target exists | OK |
| Top bar eye icon | Public profile | `href=/p/system_user`, 44x44 | OK |
| Account menu | Opens, `aria-expanded`, items 44px, Escape closes and returns focus, outside tap closes | Items 44px (Account and security `/system`, Admin `/admin`, Sign out); Escape closes and focus returns to the button; outside pointer closes | OK |
| Account menu Tab away | Closes | stayed open | Fixed (closes on focus leaving) |
| Keyboard Tab to header | Visible ring | `outline 2px rgb(10,10,10)` on Back button | OK (after fix 9) |
| ConfirmDialog | Focus to Cancel, trap, Escape closes, focus returns, scroll lock, labelled and described | `role=alertdialog aria-modal`, labelled and described; real Tab cycles Cancel and Delete only; Escape closes, focus returns to opener, body overflow restored | OK |
| ConnectivityToast | Polite status, below top bar, not blocking | `offline` event: text shown at top 60px, `pointer-events:none`, "Back online" on `online` | OK |
| CaptureSyncStatus | Polite status | code review: `role=status aria-live=polite`; overlapped connectivity toast | Fixed (position) |
| InstallPrompt | Private pages, mobile only, 44px targets, dismiss remembered | code review (needs `beforeinstallprompt`/iOS UA): section labelled, buttons 44px, bottom offset 5.5rem clears the 80px bar | OK (not run live) |
| Toasts | Polite live region, readable time, not over controls | body `role=status`, 6s, pause on hover/focus loss; was top-right over header | Fixed (bottom-center, 44px close) |
| Button disabled / loading | `disabled`, `cursor-not-allowed`, loading sets `aria-busy`, blocks clicks, returns | disabled op .4; loading `aria-busy=true`, disabled, cleared after 800ms | OK |
| Input error | red border, `aria-invalid`, `aria-describedby` to message, `role=alert` | measured `rgb(190,18,60)`, describedby `f-err-error`, text present | OK |
| FormField wiring | hint id, `aria-required` | `aria-describedby=f-name-hint`, `aria-required=true` | OK |
| SegmentedTabs | Arrow, Home/End, roving tabindex | ArrowRight selects next and focuses it, End selects last, tabindex 0/-1 | OK |

## 3. Component inventory and state matrix

Legend: P present, M missing (not applicable noted), F fixed in this pass. Hover and pressed are state layers (8% and 12% of `currentColor`); focus-visible is the global 2px #0A0A0A outline (18.1:1) plus halo; sizes measured at 375px.

| Component | Variants / sizes | default | hover | pressed | focus | disabled | loading | selected | error | success | empty | skeleton |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Button | default, tonal, outline, ghost, danger; sm 44 (40 md+), default 44, lg 48, icon 44x44 | P | F | F | F | P (.4, 4.2:1 exempt) | P | n/a | via danger | n/a | n/a | n/a |
| IconButton | 44x44, label required | P | F | F | F | P | P | n/a | n/a | n/a | n/a | n/a |
| Input / Textarea / Select | 44px (textarea 122), 16px text | P | M (border only) | n/a | F (border to ink + outline) | P (.5) | n/a | n/a | P (red border + FormField text) | n/a | n/a | n/a |
| Read-only input | | F (tonal fill) | | | | | | | | | | |
| FormField / Field | label, hint, error, required | P | | | | | | | P (icon + text + alert) | M (use hint) | | |
| Card | outlined, filled, elevated, interactive | P | F (interactive) | F | F | n/a | n/a | n/a | n/a | n/a | n/a | n/a |
| M3Card | titled panel, action slot | P | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a |
| PageHeader | title, description, eyebrow, actions | P | | | | | | | | | | |
| Section | h2/h3, description, action | P | | | | | | | | | | |
| ListRow | link, button, static; 56 / 72px | P | F | F | F (inset) | M (use static row) | n/a | P (`aria-current`/`aria-pressed`, tint) | n/a | n/a | n/a | n/a |
| Chip / Badge / StatusPill | tones; StatusPill icon + text | P | n/a | n/a | n/a | n/a | n/a | n/a | P (danger tone) | P (success tone) | n/a | n/a |
| FilterChip | 44px pill | P | F | F | F | P | n/a | P (`aria-pressed`, fill) | n/a | n/a | n/a | n/a |
| SegmentedTabs | 44px tabs, counts, scroll | P | F | F | F | M | n/a | P (raised + bold) | n/a | n/a | n/a | n/a |
| ConfirmDialog | default, danger; busy | P | P | P | P (trap) | P (busy) | P (spinner) | n/a | n/a | n/a | n/a | n/a |
| Toast | success/error/info; 6s; bottom-center | P | P (pause) | n/a | P | n/a | n/a | n/a | P | P | n/a | n/a |
| EmptyState / ErrorState / LoadingState | title, hint, action | P | | | | | P | | P | | P | |
| Skeleton | any size, reduced motion safe | P | | | | | | | | | | P |
| Brand icons | `brand-icon.tsx` | P (brand colours, decorative) | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a | n/a |
| Top bar | 56px, title 22.25px, back, eye, avatar | P | F | F | F | n/a | P (session skeleton in sidebar) | n/a | n/a | n/a | n/a | P |
| Bottom bar item | 80px cell, 64x32 pill, 12px label | P | F | F | F | n/a | n/a | P | n/a | n/a | n/a | n/a |
| Account menu | 44px items, Escape, outside, blur | P | P | P | P | P (signing out) | P | n/a | n/a | n/a | n/a | n/a |
| Nav item (sidebar) | 44px, aria-current | P | P (bg) | M (tint only) | P | n/a | n/a | P | n/a | n/a | n/a | n/a |

Remaining gaps (not worth fixing in the shared kit): Input hover has no change beyond the cursor (low value on touch); sidebar item pressed is tint-only (desktop, secondary); success has no dedicated field style (use `StatusPill tone="success"` or a hint); disabled tabs and rows are not needed yet.

## 4. Contrast table (computed, token hex values)

| Text | on white | on porcelain | on stone | on clay |
|---|---|---|---|---|
| text-primary #0A0A0A | 19.80 | 18.10 | 16.86 | 14.95 |
| text-secondary #2D2D2A | 13.81 | 12.63 | 11.76 | 10.43 |
| text-tertiary #5A5A54 | 6.94 | 6.35 | 5.91 | 5.24 |
| text-disabled #6B6B65 | 5.36 | 4.90 | 4.57 | 4.05 (icons/disabled only) |
| danger #BE123C | 6.29 | 5.75 | 5.35 | 4.75 |
| success #046C4E | 6.44 | 5.89 | 5.48 | 4.86 |
| warning #9A4A08 | 6.26 | 5.72 | 5.33 | 4.72 |
| accent cyan (text) | 2.56 FAIL | 2.34 FAIL | 2.18 FAIL | 1.93 FAIL |
| accent-ink #0060A0 (new) | 6.60 | 6.04 | n/a | 4.98 |

## 5. Component contract (how pages use the kit)

Import from `@/components/ui/primitives`, `@/components/ui/button`, `@/components/ui/m3`. Reference page with every variant and state: `/system/components` (owner-only). Radii, spacing, colour and type come from tokens; never hard-code hex, `text-[Npx]`, italics or all-caps (small eyebrow labels excepted).

Type roles (class, size on a phone): `type-headline` 22px 600 for page titles; `type-title` 16px 600 for section and card titles; body text `text-sm` 14px (reading text `text-base` 16px); label `type-label`/buttons 14px 500; caption `text-xs` 12px; floor `text-2xs` 11px. Sentence case.

Blocks:
- Page header block: `<PageHeader title description? eyebrow? actions? />` once per route, first child. Flat, no card. Do not repeat the title elsewhere; the top bar shows it after scroll.
- Section block: wrap each part in `<Section title description? action?>`; put sections in `<Stack>` (32px apart). Inside a section: 12px between header and content, 16px between form fields, 8px between buttons.
- List block: `<ListGroup><ListRow icon title supporting trailing href|onClick /></ListGroup>`. Use for any list of items, settings or links; rows are the tap target (56/72px). Do not nest interactive controls in the trailing slot of an interactive row.
- Card block: `<Card variant="outlined|filled|elevated">` for containers; `M3Card` when it needs a title. Cards are not nested in cards.
- Form block: `<FormField id label hint? error? required?><Input|Textarea|Select/></FormField>`; field spacing `space-y-4`; one filled `Button` per form, in `<ActionBar>` when the form scrolls. Submit buttons use `loading`. Never placeholder-only labels.
- Empty block: `<EmptyState title hint? action? />` always with a next step. Error block: `<ErrorState title hint action={retry} />`. Loading block: `<LoadingState label />` for short waits, `<Skeleton className="h-14 w-full"/>` rows for lists.
- Confirm block: destructive or irreversible actions go through `ConfirmDialog` (`tone="danger"`, specific confirm label, `busy` while running); not `window.confirm`.
- Toast block: `toast.success/error` through `AppToastContainer` only; short sentence, no title needed; errors state the recovery.
- Action bar block: `<ActionBar>` sticky above the bottom bar on phones: secondary ghost left of one primary.
- Tabs and filters: `SegmentedTabs` for switching views (wire panels with `segmentedIds`), `FilterChip` for toggles.
- Status: `StatusPill` (icon + text) for state, `Badge` for counts, `Chip` for tags. Colour never carries meaning alone.
- Blue text: use `text-accent-ink`, not `text-accent` (see finding 18).
- Touch: every control is at least 44px on phones; icon-only controls use `IconButton label=`; the global rules add `min-height:44px` on coarse pointers.
- Shell: pages wrap in `AppShell`; one `h1` per route via `PageHeader`; one contextual top-bar action via `TopbarAction`; new routes need a `layout.tsx` title.

Page-owner migration notes: existing exports (Card, Input, Select, Textarea, Field, Chip, Badge, StatusPill, Toolbar, PageHeader with `subtitle`, M3Page/M3Card/M3Button/M3State, Button sizes) keep working. `PageHeader` lost its box, so pages that relied on the card look just get a flat header. Button `ghost` no longer paints a background on hover (state layer instead). `text-sm` is now 14px, so dense tables may wrap sooner.
