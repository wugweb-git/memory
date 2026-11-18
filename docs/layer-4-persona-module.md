# L4 Persona Layer

Learns how the owner writes, communicates and decides. Stores that as a profile and uses it to shape system outputs.

Code: `src/lib/persona/**` · API: `src/app/api/persona/**` · UI: `/persona`

## Data (Postgres)

| Table | Holds |
|---|---|
| `persona_profiles` | One row per user: `communicationStyle`, `writingStyle`, `decisionStyle` (JSON) and `confidenceScore` |
| `behavioral_traits` | Six traits, each with value, confidence and evidence count |
| `persona_evolution_logs` | Every change: old value, new value, reason, confidence delta |
| `output_fingerprints` | AI-vs-human score for each text |
| `communication_patterns` | Extracted communication patterns |
| `feedback_memory` | Accepted / rejected / ignored feedback |
| `adaptive_ux_profiles` | UI density, preferred mode, output length, navigation style |

## Components

| File | Role |
|---|---|
| `extractor.ts` | Measures tone, writing structure and behavioural markers from text |
| `behavior.ts` | Updates behavioural traits with confidence-weighted momentum |
| `evolution.ts` | Confidence-gated, logged, reversible updates to the three style fields |
| `fingerprint.ts` | Scores text for AI contamination so AI output doesn't pollute the profile |
| `style.ts` | `enforcePersonaStyle`: light text edits applied to generated output |
| `rebuild.ts` | Orchestrates the full rebuild pipeline |
| `rebuild-source.ts` | Collects profile text as rebuild evidence |
| `adaptive-ui.ts` | Reads and updates the adaptive UX profile |
| `drift.ts` | Persona drift over time |
| `preferences.ts`, `provenance.ts`, `simulation.ts` | Preferences, evidence provenance, persona simulation |

## What it measures

- **Tone:** directness, passive-voice likelihood, urgency, formality
- **Writing structure:** average sentence length, bullet use, sentence and paragraph counts, punctuation density
- **Behavioral markers:** execution focus, analytical depth, verbosity, abstraction preference
- **Traits tracked:** `execution_focus`, `analytical_depth`, `verbosity`, `abstraction_preference`, `directness`, `urgency_bias`

## Rebuild pipeline (`rebuild.ts`)

1. **Gather evidence:** profile text, last 10 outputs, last 10 decisions, top 5 signal types, feedback counts.
2. **Length gate:** blocked if combined text is under 40 characters (text is capped at 16,000).
3. **Contamination gate:** `isVerifiedHuman` scores the text for AI-likeness. Blocked if it looks AI-written.
4. **Extract:** tone, writing structure, behavioural markers (also persists communication patterns).
5. **Update traits:** six traits move by `0.15 × confidence × (observed − current)` per update.
6. **Decision style:** built from real decision logs (sample count, average confidence, execution focus, analytical depth).
7. **Voice synthesis:** optional LLM call returns `{summary, voice, strengths}`. Heuristics work without it.
8. **Evolve fields:** `writingStyle`, `communicationStyle`, `decisionStyle` via `evolvePersonaField`.
9. **Display name:** copied from the public profile.

Returns: source length, evidence counts, traits, synthesis, new confidence score.

## Evolution rules (`evolution.ts`)

- No change if evidence confidence is below 0.4.
- New values merge over old ones. Existing keys are preserved.
- Confidence rises by 0.01 to 0.08 per run, minus 0.02 decay.
- Every change is written to `persona_evolution_logs`.
- `rollbackPersonaField` restores a field from a log entry (default: the latest) and logs the rollback itself.

## Contamination detection (`fingerprint.ts`)

Composite AI probability from:

- AI-phrase hits (e.g. "delve into", "leverage", "furthermore")
- Generic transitions (e.g. "firstly", "in summary")
- Word repetition
- Text length (burst score)
- Average word length

`verifiedHuman` is true when human probability ≥ 0.72. A prior fingerprint with AI probability > 0.5 also blocks.

## Style enforcement (`style.ts`)

Applies only when confidence ≥ 0.55:

- Reduces passive voice
- Collapses extra whitespace
- Verbosity control (`short` truncates to 6 lines)
- Structure control (`bulleted` converts to bullets)
- Directness boost (trims filler phrases when directness > 0.7)

## Where it plugs in

- **L5 output pipeline** (`lib/output/pipeline.ts`): resolves the persona, enforces style, fingerprints the result, and if verified, extracts evidence and evolves `writingStyle`.
- **L3 brain** (`lib/cognitive/contextBuilder.ts`): loads traits, preferences and persona through `PersonaResolver`.
- **Jobs** (`src/jobs`): `persona-evolution`, `behavioral-reconciliation`, `fingerprint-validation`.

## API

| Route | Purpose |
|---|---|
| `/api/persona/profile` | Read the persona profile |
| `/api/persona/traits` | Top behavioural traits |
| `/api/persona/style` | Style data |
| `/api/persona/adaptive-ui` | Read / update adaptive UX profile |
| `/api/persona/drift` | Evolution timeline |
| `/api/persona/rebuild` | Run the rebuild pipeline |
| `/api/persona/rollback` | Undo a field change |
| `/api/persona/feedback` | Submit accepted / rejected / ignored feedback |
| `/api/health/persona` | Layer health |

## Guardrails

- Evolution is slow, confidence-weighted and never driven by a single output.
- Every change is logged and reversible.
- AI-generated text is gated out of the learning loop.
- Style enforcement is confidence-gated and does not impersonate blindly.

## Relationship to the wugweb-voice skill

The L4 persona module and the `wugweb-voice` skill both describe the same person: the owner. They differ in how each is derived, not in who they describe. The persona is measured from the owner's activity. The voice is confirmed by the owner, rule by rule.

- **L4 persona** holds runtime behavioural style signals: six traits, the writing, communication and decision style fields, and the evolution log. L3 reads them as context and L5 applies them to generated output.
- **wugweb-voice** holds the confirmed Wugweb and Vedanshu writing voice for visible copy. Its fixed rules are British English, sentence case for headings, labels and buttons, no em or en dashes, no invented numbers, quotes or facts, and no filler words. Each rule is labelled confirmed, observed, candidate or waiting on samples. The voice is calibrated only from samples the owner supplies, and it never profiles personality, beliefs or decision style.

### Precedence

1. The wugweb-voice rules always win for visible copy.
2. Persona may only be an optional input, exported for the owner's review. It is never written into the voice skill automatically.
3. Persona output intended as visible copy must pass the voice check (`scripts/check.mjs` in the skill) before it is published.

### How the two connect

| Concern | Owned by L4 persona | Owned by wugweb-voice | How they connect |
|---|---|---|---|
| Source of truth | Signals measured from text, decisions and feedback | Rules confirmed by the owner from supplied samples | An owner ruling is what turns an observed pattern into a confirmed rule. Persona data alone never does. |
| Scope | Behavioural traits, writing, communication and decision style | Wording of visible copy only | The voice skill does not model decision style. Persona does not set copy rules. |
| Applying style to output | `enforcePersonaStyle` in `lib/persona/style.ts` makes light edits to generated text | The fixed rules and the voice check | `enforcePersonaStyle` runs first. The result then goes through the voice check before publishing. |
| Learning from text | Rebuild pipeline and evolution log | Owner-supplied samples only | The fingerprint gate keeps AI text out of the persona learning loop. AI text never counts as a voice sample either. |
| Change control | Confidence-gated, logged and reversible updates | Labelled rules changed by the owner | Persona changes can be exported for review. The owner decides whether any of them reach the skill. |
| Conflicts | Style suggestions | Rules that always win | If a persona edit breaks a voice rule, the voice rule stands. |
