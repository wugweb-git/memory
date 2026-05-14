# Changelog — Layer 4 Persona + Behavioral Intelligence

## 2026-05-14

### Added
- New Layer 4 Postgres schema models in `prisma/postgres/schema.prisma`:
  - `behavioral_traits`
  - `communication_patterns`
  - `preference_memory`
  - `output_fingerprints`
  - `persona_evolution_logs`
  - `feedback_memory`
  - `adaptive_ux_profiles`
- New migration: `20260514193200_layer4_persona_behavioral_intelligence`
- New persona engines under `src/lib/persona/*`
- New persona API routes under `src/app/api/persona/*`
- New Persona UI page: `src/app/persona/page.tsx`
- New Layer 4 architecture doc: `docs/layer-4-persona-behavioral-intelligence.md`

### Changed
- `src/lib/output/generator.ts` now enforces:
  1. Persona style enforcement
  2. Output fingerprint persistence
- `src/lib/output/persona.ts` now resolves persona context from new Layer 4 tables.

### Notes
- Layer 4 remains derived-intelligence only.
- Evolution behavior is confidence-gated and logged.
- AI contamination scoring is persisted for downstream trust gating.
