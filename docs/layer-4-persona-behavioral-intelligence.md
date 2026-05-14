# Layer 4 — Persona + Behavioral Intelligence Engine

## Purpose
Layer 4 stores **derived intelligence only** (not raw memory) and refines output quality through persona-aware enforcement.

## Storage
- PostgreSQL / Supabase / Neon
- New tables:
  - `persona_profiles`
  - `behavioral_traits`
  - `communication_patterns`
  - `preference_memory`
  - `output_fingerprints`
  - `persona_evolution_logs`
  - `feedback_memory`
  - `adaptive_ux_profiles`

## Engines
- `src/lib/persona/extractor.ts`
- `src/lib/persona/behavior.ts`
- `src/lib/persona/style.ts`
- `src/lib/persona/fingerprint.ts`
- `src/lib/persona/evolution.ts`
- `src/lib/persona/adaptive-ui.ts`

## Output Pipeline
Decision → Generation → Style Enforcement → Fingerprint Validation → Final Output

Implemented in:
- `src/lib/output/generator.ts`
- `src/lib/output/persona.ts`

## API Surface
- `GET /api/persona/profile`
- `POST /api/persona/rebuild`
- `GET /api/persona/traits`
- `POST /api/persona/feedback`
- `GET /api/persona/style`
- `GET /api/persona/adaptive-ui`

## Guardrails
- Confidence-gated evolution
- Logged evolution (`persona_evolution_logs`)
- AI contamination scoring (`output_fingerprints`)
- No instant mutation from a single weak signal
