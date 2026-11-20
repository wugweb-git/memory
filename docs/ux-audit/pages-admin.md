# UX audit: integrations, system, admin (375x812)

Measured in the browser on a local dev server with dummy env (API calls to Neon fail, so error, loading and empty states are exercised; some populated states were checked by reading code). Radius values and the blue accent are unchanged. Shared building blocks used: `M3Page`, `M3Button`, `M3State`, `PageHeader`, `StatusPill`, `Skeleton`, `EmptyState`. New local file `src/app/integrations/list-parts.tsx` (`ListSection`, `RowList`, `ListRow`) is imported by the system and admin pages too; replace it with the shared Section/ListRow when the foundation ships them.

## Summary of measured changes

| Metric | Before | After |
|---|---|---|
| Section titles (h2) | 13px / 20 | 16px / 26 (`text-base`) |
| Row titles | 14px bold | 16px medium or semibold |
| Supporting text | 12px, 11px notes | 13px (`text-sm`); 12px only for footnotes |
| Integration row height | 161px (stacked, full-width buttons, nested card) | 102 to 147px (icon, title, status and one action in one line) |
| Admin memory h1 | 28px with bespoke header | PageHeader (18px, same as other pages) |
| Admin memory component h2 | 18px and 22px mixed | 16px |
| Inputs | 44px high | 48px high, 16px text |
| Overflow at 375 | none | none |
| Elements under 44px (excluding checkbox/radio inside 44px+ labels) | 0 | 0 |
| Unnamed controls | 0 | 0 |

## /integrations

| Element | Measured / finding | Criterion | Fix | Before / after |
|---|---|---|---|---|
| Group card containing bordered row tiles | Card in card, 28px lost to padding | M3 list: one surface, divided rows | `ListSection` + `RowList` | 161px rows to ~120px |
| Row action | Full-width 44px button under text | Trailing action in row | Primary action at row end, extra actions (Reconnect, Change, Remove) wrap below | stacked to inline |
| Section titles | 13px | Title medium 16 | text-base | 13 to 16 |
| Setup form | Focus stayed on the Set up button | 2.4.3 focus order, 3.2.2 | Focus input on open, Escape or Cancel returns focus to opener | fixed |
| Inputs | 44px | 48dp field | min-h-12, px-4 | 44 to 48 |
| Auto-promote radios | Bordered tiles, 12px help | Row list, 13px help | Divided label rows (min 56px) | 20px control inside 56px label target |
| Notifications card | Text above a left-aligned button | Row with trailing control | Text and button in one row | done |

## /integrations/credentials and /integrations/publishing

| Element | Finding | Fix |
|---|---|---|
| Account cards | M3Card with 13px title | `ListSection` with 16px title and status pill in header |
| Field help and errors | 12px | 13px |
| Inputs | 44px | 48px |
| Empty submit | Error shown but focus stayed on Save | Focus the field |

## /system

| Element | Finding | Fix |
|---|---|---|
| Module switch thumb | Thumb positioned 21px outside the 44px track (missing `left-0`), looked clipped | `left-0`; thumb offset 42 to 21px |
| Module rows | 56px rows, 14px title, 12px state text | 16px title, 13px text |
| Health checks | Four large raw JSON blocks (about 1000px of scroll) | One section, each check a 56px disclosure row with status and chevron; JSON inside, scrollable and focusable |
| Cost card | Error told user to reload, no retry | Try again button |
| Passkeys | 11px meta text, 44px input | 13px, 48px |
| Page height | 2670px | 1742px |

## /admin

| Element | Finding | Fix |
|---|---|---|
| Operations | Three full-width buttons with captions | Three 56px rows with trailing Run button (names kept: "Run diagnostics", "Run memory audit", "Run jobs now"; visible text "Run" is contained in each name, 2.5.3) |
| Result box | Unbounded `pre` | max-h-72, scrollable, focusable, named |
| Health | 12px status, Refresh text-xs | 13px, Refresh 44px target |
| Checklist | 11px check mark, error without retry | 24px box, 56px rows, Try again button |
| Shortcuts | Bordered tiles, 11px description | Divided rows with chevron, 13px description |

## /admin/memory

| Element | Finding | Fix |
|---|---|---|
| Header | Bespoke, h1 28px, mono chip, status floating right | `PageHeader` with health status as action, scope chip below |
| Panels | h2 18px and 22px mixed, 11px meta | h2 16px, meta 12px |
| Gaps | 32px between panels | 16px on phones |

## /admin/memory/public

| Element | Finding | Fix |
|---|---|---|
| Note rows | 20px checkbox was the only target | Whole row is a label, min 56px |
| Bulk bar | Inside a card (sticky would break with overflow) | Moved after the list, still sticky above the dock |
| Back link | 21px tall | 44px target |
| Text | 13px/12px | 16px note text, 13px meta |

## /admin/profile

| Element | Finding | Fix |
|---|---|---|
| Header | Back icon + h1 + two 12px buttons on one line | Back text link, `PageHeader`, Preview and Save at 14px, wrap on phones |
| Load error | Printed "Could not load the profile: true" | Plain message; Save disabled while the profile failed to load |
| Labels | 12px secondary colour | 13px primary |
| Inputs | 44px, 14px text on desktop | 48px, 16px |

## Functional audit

| Page: control | Expected | Observed | Status |
|---|---|---|---|
| Integrations: Set up / Change | Opens form, focus in field | Focus stayed on button | fixed |
| Integrations: Escape, Cancel | Closes form, focus back | No Escape handling | fixed |
| Integrations: Save and sync | Saves, toast, sync; error inline | Disabled when empty, error "Request failed (500)" shown inline on failure | works (needs owner/data for success path) |
| Integrations: Sync now | Busy label, disabled, toast | "Syncing…" and disabled; toast on result | works |
| Integrations: Connect / Reconnect | Link to authStartPath | Rendered only when path exists | works (needs owner/data) |
| Integrations: Remove (custom feed) | Removes and toasts | No confirm step for a destructive action | needs shared change (ConfirmDialog from src/components/ui) |
| Integrations: Notion and other env-only sources | Action or explanation | Hint text only, no action (set via env) | needs owner/data |
| Integrations: Add a feed | Validation, submit state | Disabled when empty, error region, "Adding…" | works |
| Integrations: Auto-promote radios | Optimistic update, rollback on error | Rolls back, error shown | works |
| Integrations: Notifications | Turn on/off | Shows "not set up on the server" without VAPID keys | needs owner/data |
| Credentials, Publishing: Save / Remove | Validate, save, toast | Empty value error, focus now moves to field | fixed |
| System: module switch | Toggle, busy, rollback, toast | Busy and rollback with toast "Could not save module flags" | works; thumb position fixed |
| System: health disclosures | Open to see JSON | Works with keyboard (native details) | works |
| System: cost | Load, retry | Error without retry | fixed |
| System: passkeys | List, add, remove | Add button and name field present; WebAuthn flow not exercised in headless dummy env | needs owner/data |
| Admin: Run diagnostics / audit / jobs | Busy, others disabled, toast, result | Works; all three disabled while one runs | works |
| Admin: checklist | Toggle, rollback | Load failed (500) with no retry | fixed (Try again) |
| Admin: health Refresh | Reload checks | Works | works |
| Admin: shortcuts | Navigate | Links to existing routes | works |
| Public notes: select, bulk make public (confirm), make private | Confirm before public | Confirm group with autoFocus exists; load error with Try again | works |
| Profile: tabs, save, add post, remove with confirm | As labelled | Tabs keyboard-operable; load error text was "true" | fixed |
| Memory admin panels | Load data | Loading placeholders; data needs real DB | needs owner/data |
| Console | no new errors from changed code; 500s are from dummy DB | | |

## Components, blocks, patterns, states

| Item | States present | States missing | Status |
|---|---|---|---|
| Page header (PageHeader) | default | none | shared |
| ListSection / RowList (new) | default | none | added, to move to shared |
| Integration row | needs-setup, needs-connect, ready, working, error, syncing (loading), disabled | pressed (no state layer on action buttons) | needs shared change (button state layer) |
| Row action buttons | default, hover, focus-visible, disabled, loading text | pressed | needs shared change |
| Setup form | default, focus, error, saving, disabled submit | success (toast only) | ok |
| Status dot + text | success, warning, danger, neutral (text always present) | none | ok |
| Module switch | on, off, focus, disabled (saving), error toast | none | fixed |
| Disclosure row (health) | closed, open, focus | none | added |
| Cost rows | default, blocked reason text, loading skeleton, error | error retry was missing | fixed |
| Checklist row | unchecked, checked, hover, focus, error | retry was missing | fixed |
| Public-note row | default, checked, hover, focus-within, disabled | none | fixed |
| Bulk bar and confirm | idle, selected count, confirm, busy | none | ok |
| Destructive actions (Remove feed, Remove passkey) | Passkey and profile post: inline confirm on profile only | Confirm for feed and passkey removal | needs shared change |
| Empty states | integrations list, passkeys, notes, posts | none | ok |
| Loading states | skeleton or status text on all pages | none | ok |
| Error states | role=alert, retry on integrations, cost, checklist, notes, profile | modules list says reload (no retry) | needs shared change |

## Shared changes requested

1. `M3Card` h2 should be `text-base` (it is 13px); `M3Page`/`PageHeader` title and subtitle sizes (18px title, 13px subtitle).
2. A state-layer (pressed) on `Button` and tonal button variants; the integrations row actions use local classes.
3. `ConfirmDialog` usage for removing a custom feed and a passkey.
4. Shared Section/ListRow to replace `src/app/integrations/list-parts.tsx`.
