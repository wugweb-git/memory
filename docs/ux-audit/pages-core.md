# UX audit: core pages (375x812, dummy local env)

Measured in the Browser pane with a probe script (computed font size, bounding boxes, scrollWidth, accessible names). Type roles map M3 onto the named scale: h1 = title large (`text-xl`, 22px), section h2 = `text-base`/`text-lg`, list titles `text-base`, supporting text `text-sm`. Radii and the blue accent are untouched. New shared block: `src/app/component/PageIntro.tsx` (swap for the foundation PageHeader when it lands).

Note: the global coarse-pointer rule in `globals.css` forces `min-height: 44px` on controls, so my `min-h-12` (48) on inputs resolves to 44px in the browser. 44 meets the target; no action needed.

## /console
| Element | Before | After | Criterion | Fix |
|---|---|---|---|---|
| h1 block | icon tile + 22px h1, subtitle wrapped to 2 lines, 3 stacked lines of head (top 80) | `PageIntro`, 22px h1, 1-line subtitle | consistent title role | removed decorative tile |
| Section h2 | 13px, text-secondary | 16px/25.6, text-primary | M3 title medium | `text-base font-semibold` |
| Section spacing | mb-8 (32) | mb-6 (24) | 4/8 rhythm | tightened |
| Stat cards | 1 column <420px, each ~130px tall, value 24px, uppercase "DEGRADED" | 2 columns, min-h 112, value 22px sentence case "Degraded" | no all-caps; density | grid-cols-2, sentenceCase() |
| Next-action / quick rows | 14px title, 12px desc, min-h 56 | 16px title, 14px desc, min-h 64, state layer on press | list row 56-72 | `ROW_LINK` |
| Layer cards | 14px / 12px, dot 6px | 16px / 14px, dot 8px | legibility | resized |
| Page height to "System layers" | 1348px | 1139px | | |
| Tap targets, overflow, h1 count, accessible names | none under 44; 0px overflow; 1 h1 | same | | already OK |

Functional audit
| Control | Expected | Observed | Status |
|---|---|---|---|
| Next actions list | rows link to rec.href; skeleton, error with Try again, empty state | all states render; retry refetches | works |
| Quick access (6 links) | navigate | hrefs valid | works |
| Layer health | probes 4 APIs, Offline on failure with explanatory note | Offline shown with status note under dummy env | works |
| Error boundary Reload | reloads | present | works |
| Console 500s | dummy DB | expected, handled by UI states | needs owner/data (real env) |

## /memory
| Element | Before | After | Criterion | Fix |
|---|---|---|---|---|
| h1 | 34px weight 900 (`font-black`), icon tile, refresh pill on its own row | 22px w600 via `PageIntro` | title role | |
| Stat cards | 24px black, 11px sub text | 22px semibold, 14px label/sub, placeholders get sr-only "Unavailable" | 11px floor, contrast (tertiary to secondary) | |
| Upload heading | h3, 11px uppercase tracking-widest, under wrong parent | h2 (page) / h3 (buffer) 18/16px sentence case | heading order, no all-caps | `heading` prop on `ManualUpload` |
| Filter inputs | label 12px | label 14px, input 16px, h44 | | |
| Packet rows | h3 14px, meta 12px, no focus ring | 16px / 14px, min-h 64, focus ring | list row | |
| Buttons | 12px bold labels | 14px semibold, focus ring added | | |
| Status line | claimed "Your memory vault" with a dot | "Checking the memory store…" / connected / unreachable | status honesty | |

Functional audit
| Control | Expected | Observed | Status |
|---|---|---|---|
| Refresh | disables and shows "Refreshing…" | works | works |
| Status/Source filters | refetch on type, Clear filters resets | works | works |
| Packet row, Replay, Delete (confirm group, autofocus Keep) | per label | no packets in dummy env, code reviewed | needs owner/data |
| Upload (file picker) | labelled input, progress, errors | labelled, error handling present | works |
| Error state | store down shows retry, not "empty" | correct | works |
| Status line while loading said "connected" | | fixed | fixed |

## /content (Output studio)
| Element | Before | After | Fix |
|---|---|---|---|
| Tabs | left-aligned 44px pills, unequal widths | 3-column full-width segmented buttons, 48 high | |
| Stepper | three steps, first label truncated ("Pick a deci...") | "Step 1 of 3: Pick a decision" plus 3 progress segments, sr labels | |
| Helper text | 12px tertiary | 14px secondary | |
| List/draft rows | 14px, min-h 44 | 16px, min-h 64 | |
| Fields | min-h 44 | min-h 48 (44 effective) | |
| h1 18px, M3Card h2 13px | | needs shared change (`m3.tsx`): h1 to 22px, card title to 16px | |

Functional audit
| Control | Expected | Observed | Status |
|---|---|---|---|
| Tabs Compose/Live/Drafts | aria-pressed toggles | verified | works |
| Generate draft | disabled until decision id, enabled after typing | verified | works |
| Live / Drafts loading failures | error message + Try again | "Could not load ..." with retry | works |
| Generate (dummy env) | error or toast | request pending (30 s timeout) so error not observed in 2.5 s | needs owner/data |
| Save, Publish, Queue, version restore, edit/remove section | per label | not reachable without data; code reviewed | needs owner/data |

## /buffer
| Element | Before | After | Fix |
|---|---|---|---|
| h1 | 28px, header cluster (Add item, capacity, refresh) crammed into one row, "Checking ca..." truncated | 22px `PageIntro`; actions row, then full-width capacity card | |
| Search | h44, 13px icon | 16px text, 18px icon | |
| Filter chips | visible scrollbar line under chips | `scrollbar-hide` | |
| Item rows | 14/12px | 16/14px, min-h 64 | |
| Capture methods | 4 columns of 12px labels | 3 columns (4 at sm), 14px labels | |
| Details panel | h3 14px, 11px id | h2 18px, h3 16px, id 12px | |

Functional audit
| Control | Expected | Observed | Status |
|---|---|---|---|
| Filter chips | one pressed, refetch | verified (Raw pressed, others false) | works |
| Capture method buttons (7) | swap panel, aria-pressed | verified | works |
| Add item | jumps to #capture | href valid | works |
| Refresh, Try again | refetch | present | works |
| Search | filters loaded items | no data to filter; empty state text correct | needs owner/data |
| Review/Promote/Purge (confirm group) | per label | no items in dummy env | needs owner/data |

## /history
| Element | Before | After | Fix |
|---|---|---|---|
| Gutter | extra `px-4 py-6` on top of shell padding (content inset 32px) | shell gutter only | |
| Head | h1 + icon refresh | `PageIntro`, 48px refresh | |
| Rows | 14px/12px | 16px/14px | |
Functional: error card with Try again works; empty state links to /content; refresh hidden on error (works).

## / (page.tsx)
Server redirect to the public profile; no UI. Nothing to change.

## Gate
`npx tsc --noEmit` clean; eslint on changed files clean; `npm test` 375/375.

## Shared changes needed (not made)
1. `src/components/ui/m3.tsx`: `M3Card` h2 is `text-sm` (13px), supporting copy `text-xs`; M3Page h1 resolves to 18px at 375 (content page). Raise to title medium (16) and 22px, 14px body.
2. Replace `PageIntro` with the foundation PageHeader once available.
3. Shell text (nav labels, eyebrow) accounts for most remaining sub-14px counts (13px x16-22, 11px x5); 13px (`text-sm`) is the token floor for secondary UI, so these are intentional.
4. Shared dev-session cookie: all agents' localhost ports share one `prism_session` cookie, so logins drop between agents.

## Components, blocks, patterns, states
Legend: D default, H hover, P pressed, F focus-visible, X disabled, L loading, S selected, E error, OK success, Em empty.

| Page | Item | States present | States missing / gaps | Status |
|---|---|---|---|---|
| all | Header block (`PageIntro`: h1, description, status, actions) | D | none | fixed (new shared block, replaces 5 ad-hoc headers) |
| console | Section block (h2 + content) | D | none | fixed (title medium) |
| console | List row (next actions, quick access) | D H P F | selected n/a | fixed (P state layer added, 64px rows) |
| console | Stat card | D L (skeleton) E (Unknown/Degraded text) | H/P n/a (static) | works |
| console | Layer card | D L (Checking pulse) E (Offline text+dot) OK | no retry control; note says reload | needs owner decision |
| console | Next actions pattern | L E+retry Em OK | none | works |
| memory | Stat card | D L Em ("--" + sr text) | E uses same dash; page-level alert covers it | works |
| memory | Filter form block | D F | X n/a; no validation (free text) | works |
| memory | Packet list row | D H P F S(aria-pressed) | none | fixed (P, F added) |
| memory | Packet detail card + Replay/Delete | D H F X L(replaying/deleting) E OK(refetch) confirm group | P state on buttons not set | partial, needs shared Button |
| memory | Patterns: loading skeleton, error+retry, empty (two variants), confirm delete | present | pagination: fixed limit 100, no pager | needs owner (API contract) |
| memory | Upload block (`ManualUpload`) | D H F L(progress) OK E(+sign in link) | P state | partial |
| content | Segmented tabs | D H F S X n/a | P | partial |
| content | Stepper | D current/done | not interactive by design | works |
| content | Form block (decision, select, draft textarea) | D F E(aria-invalid) X L(generating) | validation only on submit | works |
| content | Action bar (Publish, Save, Queue) | X L | P/H depend on `M3Button` | needs shared change |
| content | Draft/section rows | D H P F | none | fixed |
| content | Patterns: skeleton, error+retry, empty+action, toast success/failure, confirm via window.confirm | present | native confirm is not a styled dialog | needs shared ConfirmDialog (exists in ui, not wired here) |
| buffer | Search field | D F | no clear button when text present | open |
| buffer | Filter chips | D H F S | P | partial |
| buffer | Item rows (cards on phone, table on md+) | D H P F S | none | fixed |
| buffer | Details card + Review/Promote/Purge | D H F X L E OK confirm | none | works |
| buffer | Capture method buttons | D H F S | P | partial |
| buffer | Patterns: skeleton, error+retry, empty x3 variants, alert strip | present | pagination: limit 50, no "load more" | needs owner (API contract) |
| history | List card | D | H/F n/a (not interactive) | works |
| history | Link row | D H F | P | partial |
| history | Patterns: skeleton, error+retry, empty+action, refresh L | present | no pagination | needs owner (API contract) |

Pressed (P) states on bare `<button>` elements without `active:` styling remain where they come from shared `Button`/`M3Button` (not mine); recommend adding `active:` layers there.
