# Pages experience audit: ask, cognitive, persona, career, portfolio, login, offline, more, public profile

Scope: 375x812 viewport, own dev server (port 3103, dummy env, forged owner session). Probe = in-page script measuring computed heading sizes, text under 13px, tap targets under 44px, text contrast (4.5:1, 3:1 large), accessible names, overflow, document title. Standards: WCAG 2.2 AA (1.4.3, 1.4.4, 1.4.10, 2.4.2, 2.5.8, 1.3.1), Material 3 type and list guidance mapped onto the 2xs..5xl scale. Radius and the blue accent were not touched.

Method note: before = first probe on the unmodified branch; after = re-probe after the edits. Persona loaded state could not be reached locally (needs the DB), so persona was verified by code and skeleton/error states only.

## Cross-cutting findings

| Finding | Measured | Criterion | Fix | Before / after |
|---|---|---|---|---|
| Accent blue used as text colour on links and text buttons (View live, Add role, Edit, Add to projects, profile link) | 2.56:1 and 2.34:1 on the white card | 1.4.3 needs 4.5:1 | Text now `text-text-primary` with underline and accent underline colour (blue stays as the visual cue) | 5 failing pairs on /career and /portfolio, 0 after |
| Rank "1" numeral and eyebrow-like labels in accent (cognitive rank, profile "Now:", kind label) | accent on light, below 3:1 | 1.4.3 / 1.4.11 | Switched text to text-primary / text-secondary | fixed |
| 11px (`text-2xs`) used for timestamps, source chips, tab labels, counters, dates | 11px | 1.4.4 readability; M3 label floor 12px | `text-2xs` raised to `text-xs` (12px) on all my pages | 11px nodes: cognitive 11 to 6, career 15 to 14 (rest are shared components), profile 34 captions now 12 |
| Primary buttons turn accent blue on hover with white text | 2.56:1 | 1.4.3 | `hover:bg-text-secondary` (login, persona) | fixed |
| Page title sizes inconsistent across slice | cognitive 22px, persona 28px, career/portfolio 18px (PageHeader), login 28px | M3 one top-level headline role | Persona aligned to 22px (`text-xl`); career/portfolio rely on shared PageHeader (see requests) | persona 28 to 22 |

## ask

| Element | Measured before | Threshold | Fix | After |
|---|---|---|---|---|
| Root container `h-screen` | 100vh, composer hidden under mobile browser UI | stable viewport | `h-dvh` | composer visible |
| Header subtitle | wraps to 3 lines | single-line app bar subtitle | "From published notes", truncate | 1 line |
| Sources chips, timestamps | 11px | 12px floor | `text-xs` | 12px |
| Textarea / send / back / menu | 44px, 16px text | 44px, 16px | already compliant | unchanged |
Unique title "Ask | Identity Prism", one h1, landmarks present, overflow 0.

## cognitive

| Element | Before | Threshold | Fix | After |
|---|---|---|---|---|
| Tab labels | 11px | 12px | `text-xs` (tabs stay 48px high, 5 columns) | 12px |
| Score ring caption, Eyebrow | 11px | 12px (eyebrow uppercase kept, allowed) | `text-xs` | 12px |
| Rank 1 numeral | accent text 3xl | 3:1 large text | `text-text-primary` | pass |
Heading order h1 22px then h2 18px, no skipped levels, tap targets all 44+.

## persona

| Element | Before | Fix | After |
|---|---|---|---|
| h1 | 28px, 16px/400 shell fallback | 22px to match the other tool pages | 22px |
| Section gap | 32px between cards | 24px (`space-y-6`) | 24px |
| Regenerate button | 44px, content width | `min-h-12 w-full` on phones | 48px full width |
| Adaptive option chips | 12px text | 13px, px-4 | 13px, 44px high |
| Chip captions, percentages | 11px | 12px | 12px |
| "Revert" link text | accent blue | primary + underline | passes 4.5:1 |

## career

| Element | Before | Fix | After |
|---|---|---|---|
| Action links (View live, Add role, Edit) | accent 2.56:1 | primary + underline | pass |
| Role-form counters, optional tags | 11px | 12px | 12px |
| h2 "Applications" and "Opportunities" | **28px** next to a 13px card title and 18px page h1 (from shared JobPipeline / JobSearchAgent) | not in my slice | listed under requests |

## portfolio

| Element | Before | Fix | After |
|---|---|---|---|
| Type switcher | wrapped chips, "Case studies (1)" broke to 2 lines | equal-width segmented row, counts moved into card title ("Projects (2)") | one line each, 44px |
| Link buttons | accent text 2.56:1 / 2.34:1 | primary + underline | pass |
| "Featured" tag | accent text | secondary, semibold | pass |

## login

Already compliant: inputs 52px high at 16px, button 48px, h1 28px, one h1, title "Sign in | Identity Prism". Fixed: accent hover on primary buttons (2.56:1), 11px micro text. 1x1 sr-only checkbox is a deliberate peer input.

## offline

| Element | Before | Fix | After |
|---|---|---|---|
| Body copy | 13px | 16px | 16px |
| Retry button | 44px, content width, bold | 48px full width, semibold | 48px |

## more

| Element | Before | Fix | After |
|---|---|---|---|
| Document title | generic "Identity Prism \| Neural OS" (no layout) | new `layout.tsx` metadata | "More \| Identity Prism" |
| Row title / hint | 13px / 12px | 16px medium / 13px | M3 list type |
| Row height, leading icon | 56px, 36px tile, 18px icon | 64px (two-line row), 40px tile, 20px icon | M3 two-line list item |
| Group subheader | 12px tertiary | 13px medium secondary, 16px inset | readable, aligned to row text |

## public profile (/p/[username])

| Element | Before | Fix | After |
|---|---|---|---|
| h1 | 40px black weight (two lines) | 34px semibold on phones, 48px from sm | 34px |
| Page padding / section gap | 56px top, 64px gaps | 32px top, 40px gaps on phones | denser, same on sm+ |
| Section eyebrow h2, dates, tags, footer | 11px | 12px | 12px |
| Accent text ("Now:", kind, hover colours) | accent | primary/secondary, underline on hover | passes |
Content issue (data, not code): a blog post title renders literal `**Generating Output**` markdown asterisks.

## Gate

tsc clean, eslint clean on all slice directories, npm test 375/375.

## Shared-file requests (not edited)

1. `src/components/ui/m3.tsx` M3Card h2 is 13px (`text-sm`); raise to `text-base` (M3 title-medium) and card body to 14-16px.
2. `src/components/ui/primitives.tsx` PageHeader h1 is `text-lg` 18px; align to `text-xl` 22px, otherwise career/portfolio titles are smaller than cognitive/persona. Input/Select/Textarea use `text-sm` (13px); make them `text-base` on phones to stop iOS zoom.
3. `src/app/component/JobPipeline.tsx` and `JobSearchAgent.tsx`: h2 at 28px with an eyebrow, oversized against the page; use a 18px h2 inside a card.
4. `src/components/ui/button.tsx` default and `outline` variants are `text-sm` 13px; M3 buttons are 14px label with 40-48px height.
5. Hover tokens: `hover:bg-accent` with white text appears elsewhere in the app and fails 4.5:1.
