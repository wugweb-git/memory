# Identity Prism OS design system (MASTER)

Source of truth for tokens, primitives and usage. Pages may deviate only via a documented page override in `design-system/pages/<page>.md`.

**Direction.** A calm, personal cognitive OS. Light theme, warm-neutral porcelain surfaces, near-black ink, one electric-cyan accent used only for focus and live state. Quiet by default: flat bordered surfaces, one elevation step on hover, one gentle page-enter. Sentence-case headings, no italics, no all-caps except tiny eyebrow labels.

Implementation lives in:

| Concern | File |
|---|---|
| CSS variables, motion, a11y baseline | `src/app/globals.css` |
| Tailwind exposure of tokens | `tailwind.config.ts` |
| Shell (sidebar, topbar, drawer, dock) | `src/app/component/AppShell.tsx` |
| Primitives | `src/components/ui/primitives.tsx`, `button.tsx`, `m3.tsx` |
| Navigation structure and labels | `src/config/ui-content.ts` |

Rule: `--*-rgb` channel variables must be edited together with their hex twins (Tailwind opacity modifiers read the channels).

---

## 1. Tokens

### Colour (light)

| Role | Token / class | Value |
|---|---|---|
| Page | `bg-bg-primary` | `#F5F5F0` |
| Subtle fill | `bg-bg-secondary` | `#EDEDE8` |
| Skeleton, pressed | `bg-bg-tertiary` | `#E0E0DB` |
| Raised surface | `bg-bg-elevated` | `#FFFFFF` |
| Ink | `text-text-primary` | `#0A0A0A` |
| Body | `text-text-secondary` | `#2D2D2A` |
| Muted | `text-text-tertiary` | `#5A5A54` (at least 6:1 on page) |
| Placeholder, disabled | `text-text-disabled` | `#6B6B65` (at least 4.5:1) |
| Hairline | `border-border-primary` / `border-border-secondary` | 8% / 4% black |
| Accent (focus, live) | `accent` | `rgb(0 170 255)` |
| Strong action fill | `bg-accent-high` | `#000` |
| Semantic | `success` `warning` `danger` | `#047857` `#B45309` `#E11D48` |

Do not put accent cyan behind white or porcelain text (about 2.4:1). Primary buttons are ink fill; hover is `text-secondary`, never cyan.

### Type

One fluid scale, named `2xs` to `5xl` (`text-2xs` 11px floor, `text-sm` 13px UI, `text-base` 15 to 16px body, `text-lg` headings in panels, up to `text-5xl` display). No arbitrary `text-[Npx]`. Inter for UI, JetBrains Mono for small data labels.

### Spacing (4/8 rhythm)

`--space-2xs` 4 · `xs` 8 · `sm` 12 · `md` 16 · `lg` 24 · `xl` 32 · `2xl` 48. Tailwind keys `2xs xs sm md lg xl 2xl` (for example `gap-xs`, `p-md`). Standard Tailwind numeric spacing is fine when it lands on the 4/8 grid (`gap-2`, `p-4`, `space-y-4`). Page gutter is `--gutter` (16px phone, 32px from `md`). Section gaps: 16 between cards, 24 between groups, 32 to 48 between page regions.

### Radius (one scale)

| Role | Class | Value | Use |
|---|---|---|---|
| control | `rounded-control` | 12 | Buttons, inputs, selects, nav rows |
| card | `rounded-card` | 16 | Cards, list rows, empty state |
| panel | `rounded-panel` | 24 | Page header, `M3Card` sections |
| pill | `rounded-pill` | full | Badges, status pills, avatars, dock indicator |

Primitives behind them: `--radius-xs` 6, `sm` 8, `md` 12, `lg` 16, `panel` 24, `xl` 32, `2xl` 40. `rounded-radius-xl/2xl` are legacy hero radii; do not use in new work.

### Elevation (one scale, warm-tinted)

| Level | Class | Use |
|---|---|---|
| 0 | none | Default. Flat, hairline border only |
| 1 | `shadow-elev-1` | Resting card that must read as a surface |
| 2 | `shadow-elev-2` | Hover/raised, popovers |
| 3 | `shadow-elev-3` | Overlays: drawer, sheet, modal |

`shadow-3xl` is legacy. Never use pure black drop shadows or per-component shadow values.

### Motion

| Token | Value | Use |
|---|---|---|
| `duration-instant` | 80ms | Press feedback |
| `duration-fast` | 150ms | Hover, focus, colour/state change |
| `duration-base` | 220ms | Enter, expand, page-enter |
| `duration-slow` | 320ms | Drawer, sheet |
| `duration-exit` | 140ms | Leaving (about 65% of the enter) |
| `ease-out-soft` | `cubic-bezier(.16,1,.3,1)` | Arriving |
| `ease-in-soft` | `cubic-bezier(.4,0,1,1)` | Leaving |
| `ease-standard` | `cubic-bezier(.4,0,.2,1)` | In-place state change |

Rules: animate `transform` and `opacity` (and colours); never width/height/top/left. Exactly one decorative motion exists: `.page-enter` (fade plus 4px rise, 220ms) on the content region. Everything else is feedback to a user action. `prefers-reduced-motion: reduce` zeroes the duration tokens, kills animations and transitions, and removes hover travel. Use `motion-safe:animate-pulse` / `motion-safe:animate-spin` for any looping indicator. No state is ever communicated by motion alone.

### Layout chrome

`--topbar-h` 56px · `--dock-h` 64px · `--sidebar-w` 240px · `--content-max` 72rem. Utilities: `pt-topbar` (under the fixed topbar plus status-bar inset), `pb-dock` (above the mobile dock plus home-indicator inset plus 24px). Safe-area insets are applied to the topbar, dock, drawer and content gutters; do not add your own fixed bars without reading these.

---

## 2. Navigation

Structure comes only from `NAV_GROUPS` in `src/config/ui-content.ts`.

| Group | Items | Plain meaning |
|---|---|---|
| Workspace | Console, Ask, Memory, Buffer, History | Daily use |
| Intelligence | Cognitive, Persona, Career | The thinking layers |
| Output | Content, Portfolio, Profile | What you publish |
| Admin | Integrations, System, Admin | Setup and access |

Each item has a short `hint` shown in the mobile drawer. Feature-flagged items disappear with their empty groups.

**Desktop (from md).** Fixed 240px sidebar with the same groups, brand, status, session. Topbar shows the page title and the action slot.

**Phone (375px).**
- Topbar: home mark, page title (a `<p>`, not a second h1), one action slot, account chip.
- Bottom dock: the top four destinations (`MOBILE_DOCK_ITEMS`, max `MOBILE_DOCK_MAX`) plus **More**, which opens the drawer. When the current page is only in the drawer, More shows as current.
- Active state is never colour alone: filled ink pill behind the icon, bold label, heavier stroke, and `aria-current="page"`.
- Drawer: modal dialog, groups with headings, label plus hint per row, focus trap, Esc closes, scroll locked, focus returns to More.
- Dock targets are at least 48 x 64px; content reserves `pb-dock`.

**Topbar action slot.** Render `<TopbarAction>…</TopbarAction>` (exported from `AppShell.tsx`) inside a page for one contextual action, for example a primary Button. One action only; secondary actions go in the page's `PageHeader` actions.

**A11y kept from the earlier pass:** skip link, `main#main-content`, focus-trapped drawer, `aria-current`, safe-area insets, 44px touch floor on coarse pointers, visible `:focus-visible` ring with forced-colors fallback, scroll-padding so focus is not hidden behind fixed bars.

---

## 3. Primitives

All import from `@/components/ui/primitives` unless noted. They use token classes only.

| Primitive | Purpose | Key props |
|---|---|---|
| `Card` | Content surface | `elevation` 0 (default) / 1 / 2 |
| `Input` | Single-line text | `invalid` |
| `Textarea` | Multi-line text, min height 96px, vertical resize | `invalid`, `rows` |
| `Select` | Native select with token chevron | `invalid` |
| `Field` | Label above, hint or error below | `id`, `label`, `hint`, `error`, `required` |
| `Skeleton` | Loading block (`motion-safe` pulse) | size via className |
| `EmptyState` | Nothing here yet, with a next step | `title`, `hint`, `action`, `icon` |
| `Badge` | Compact label or count | `tone`, `icon` |
| `StatusPill` | State: icon and text together | `tone` |
| `Toolbar` | Wrapping row of controls | `label` |
| `PageHeader` | Page h1, subtitle, actions slot | `title`, `subtitle`, `actions` |
| `Button` (`button.tsx`) | Actions | `variant` default/outline/ghost/danger, `size` sm/default/lg/icon, `loading` |
| `M3Page`, `M3Card`, `M3Button`, `M3State` (`m3.tsx`) | Page wrappers used by existing pages; delegate to the primitives above | M3Page `actions`, M3Card `description` |

`Tone` = `neutral | success | warning | danger | info`.

### States every control must have

Default, hover (`duration-fast`), pressed (`active:scale-[0.98]`, instant), focus-visible (global ring), disabled (40 to 50% opacity, `cursor-not-allowed`, native `disabled`), loading (Button `loading`, `aria-busy`), invalid (red border plus visible error text with an icon via `Field`).

### Usage rules

- One `PageHeader` (or `M3Page`) per route; it is the only h1. Topbar title is not a heading.
- One primary Button per view. Secondary is `outline`, tertiary `ghost`, destructive `danger` and confirm first.
- Forms: `Field` for every control. Label above, hint or error below, never placeholder-only. Inline validation on blur.
- Status: use `StatusPill` for health, sync and publish state. Use `Badge` for counts and neutral tags.
- Loading: `Skeleton` shaped like the final layout for blocks; `M3State state="loading"` for a line of text. Empty: `EmptyState` with a next action. Error: `M3State state="error"` (role alert, icon, plain cause and fix).
- Lists above 5 items need a different pattern (grid, tabs, grouping), not a longer list.

### Do and don't

| Do | Don't |
|---|---|
| `rounded-control` on controls, `rounded-card` on cards, `rounded-panel` on page sections | Mix `rounded-xl`, `2xl`, `3xl` on peers of the same level |
| Flat bordered cards, `shadow-elev-1` only when elevation carries meaning | Per-component `shadow-[0_…]` values or pure black shadows |
| `gap-2/4/6`, `p-4`, `space-y-4` (4/8 grid) | `p-[13px]`, `mt-[37px]`, `gap-5` just because |
| `transition-colors duration-fast ease-standard` | `transition-all duration-700`, hover lifts above 2px |
| Icon plus text for state (`StatusPill`) | Green or red text/dot as the only signal |
| `motion-safe:animate-*` for loops | Unguarded `animate-pulse`, `animate-spin`, infinite loops |
| Token classes (`bg-bg-elevated`, `text-text-tertiary`) | Hex, `zinc-*`, `black`, `white` in components |
| Sentence-case labels, plain verbs ("Save changes") | "Submit", jargon, all-caps (except 2xs eyebrows) |
| Touch targets 44px on coarse pointers (global floor) | Icon-only controls under 24px or without an accessible name |
| Wrap long toolbars; keep one action in the topbar | Cram three buttons into the topbar |

---

## 4. Accessibility checklist (per page)

- Skip link works; focus lands on `#main-content`.
- Exactly one h1; headings sequential.
- Colour is never the only signal (icon, text, shape, weight).
- Body text at least 4.5:1; muted text uses `text-tertiary` or darker; placeholders `text-disabled`.
- Inputs 16px on phones (global rule prevents iOS zoom).
- Reduced motion verified: no looping animation, no hover travel.
- Fixed UI does not hide focused controls; content uses `pt-topbar` and `pb-dock`.
- Test at 375px, 768px and 1280px, plus landscape.

## 5. Out of scope (for now)

Dark theme (`darkMode` is configured but no dark token set exists; if added, design both modes together and redefine every hex and `-rgb` pair), charts, data-table component, toast styling beyond the dock offset.
