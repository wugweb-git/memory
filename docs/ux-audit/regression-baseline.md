# UX regression baseline

Source-level guards (no browser) keep the redesign from regressing the owner's UX and accessibility rules.
They live in `test/hardening/ux-*.test.ts` (run by `npm test`), with detectors in `src/lib/ui-guards/`.

- **Baseline**: `test/ux-baseline.json` lists known pre-existing offenders as `(rule, file, count)`. A guard fails only when a file gains MORE offenders of a rule than listed, so line numbers may move freely and fixing offenders never breaks anything.
- **Allow-list**: `test/ux-allowlist.json` holds *intentional* exceptions with a reason (not audit debt).
- **Regenerate** after fixing offenders (counts shrink): `npx tsx test/ux-baseline-update.ts` (add `UX_VERBOSE=1` to print every offender with file:line).
- Failure output lists `file:line message` for each new offender.

## Offender counts on main (at 405b388)

| Rule | Offenders | Notes |
|---|---:|---|
| nav-href-resolves | 0 | |
| nav-dock-limit | 0 | dock = 4 items + More |
| nav-item-complete | 0 | |
| nav-no-duplicate-hrefs | 0 | |
| page-title | 0 | root `/` redirect page is a documented exception |
| page-title-unique | 0 | |
| page-h1 | 2 | `/persona` (3 h1) and `/p/[username]` (3 h1) |
| token-hex | 0 (1 allow-listed) | `layout.tsx` `viewport.themeColor` x2: meta theme-color cannot use CSS vars |
| token-black-zinc | 0 | |
| token-arbitrary-font | 0 | |
| token-italic | 0 | |
| token-uppercase-eyebrow | 0 | |
| token-inline-radius | 1 | `src/app/component/KnowledgeSource.tsx:72` |
| touch-target | 5 | `ui/button.tsx` (default `min-h-10`, sm `min-h-9`, icon `h-10`), `ui/primitives.tsx` (input and select `min-h-10`) |
| a11y-img-alt | 0 | |
| a11y-icon-button-label | 0 | |
| a11y-form-label | 0 | |
| a11y-tabindex | 0 | |
| a11y-outline-none | 1 | `src/app/career/RoleForm.tsx:90` tag-input `outline-none` with no focus-visible replacement |
| pwa-manifest | 0 | start_url, scope, shortcuts, icons, screenshots all resolve |
| pwa-sw-version | 0 | `VERSION = 'v4'` |
| pwa-viewport-zoom | 0 | |

Total baselined offenders: 9 (across 6 files).

## Findings worth acting on

- **page-h1 (`/persona`, `/p/[username]`)**: both render three h1 elements, one per state branch (loading / empty / loaded). They are mutually exclusive at runtime, so users see one; the guard counts statically. Consolidating to a single h1 outside the branches would clear it. The guard counts an imported component's h1 only when the page mounts that component (an unused `PageHeader` does not count).
- **touch-target**: `button.tsx` documents that every size reaches 44px on coarse pointers via a `@media (pointer: coarse)` rule in `globals.css`, so these are mitigated on phones but violate the literal "min-h >= 11" rule on desktop and in source. Resolve by moving to `min-h-11` or adding a reasoned entry to `test/ux-allowlist.json`.
- **a11y-outline-none**: the one real focus-indicator gap is the tag input in `RoleForm.tsx` (focus likely shown on a wrapper; verify by keyboard).
- **a11y-outline-none exemption**: elements with `tabIndex={-1}` (dialogs, `<main>`, headings used as programmatic focus targets) are not keyboard tab stops and are exempt.

## Rules and how they are detected

| Rule | Detection |
|---|---|
| nav-* | imports `NAV_GROUPS`, `MOBILE_DOCK_ITEMS`, `MOBILE_DOCK_MAX`; resolves hrefs against `src/app/**/page.tsx` (route groups stripped, `[x]` segments match any value) |
| page-title | `metadata` / `generateMetadata` on the page or its nearest ancestor layout below the root |
| page-title-unique | static title strings compared across resolved pages |
| page-h1 | JSX `<h1` count across the page and the components it mounts (sr-only counts) |
| token-* | regex over comment-stripped `.tsx` in `src/app` (not `api/`) and `src/components`; uppercase checks the same element for `text-2xs`/`text-xs` |
| touch-target | in `src/components/ui`, `h-N`/`min-h-N` with N < 11 on padded controls (breakpoint-prefixed values and spinners ignored) |
| a11y-* | JSX tag parser: `img`/`Image` alt, icon-only button aria-label, input/select/textarea label (aria-label, `htmlFor`, wrapping label, prop spread), `tabIndex` > 0, `outline-none` without focus-visible ring |
| pwa-* | `public/manifest.json` (routes and files on disk), `public/sw.js` VERSION, `src/app/layout.tsx` viewport zoom flags |

Known limits: static analysis cannot see classes assembled at runtime or text rendered by third-party components; `a11y-form-label` trusts wrapper components that forward props.
