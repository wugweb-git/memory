# Design

Identity Prism UI is **mobile-first, light-first**, action-prioritized, and output-driven.

> Note: earlier revisions of this doc said "dark-first." That is obsolete — the
> product is light-first (porcelain/earthy light theme). Any remaining dark
> surfaces (`/memory`, `/buffer`) are legacy and slated for retheme.

## Principles
- Decisions over dashboards
- Outputs over analytics noise
- Minimal friction interactions
- One primary action per screen
- Explainability over opacity

## Design system (current)
- **Theme:** light, token-driven. Colors come from CSS variables in
  `src/app/globals.css` (`--bg-*`, `--text-*`, `--border-*`, `--accent`, semantic
  `--success/--danger/--warning`) and are exposed to Tailwind in `tailwind.config.ts`.
  No hardcoded hex in components — use the tokens.
- **Type scale:** one continuous fluid ramp (`2xs → 5xl`) defined in `globals.css`
  and mapped in Tailwind. No arbitrary `text-[Npx]`; 11px floor for readability.
- **Headings:** sentence case, no italics, no all-caps. Small uppercase eyebrow
  labels (e.g. nav group titles) are the only intentional uppercase.
- **Shell:** one route-aware `AppShell` (grouped sidebar + top bar + mobile drawer +
  bottom dock) drives every internal route. Public profile (`/p/*`) is the only
  surface outside the shell.
- **Surfaces:** `glass-panel` cards, `rounded-radius-xl`, `border-border-secondary`.
