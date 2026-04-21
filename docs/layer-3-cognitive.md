# Layer 3: Cognitive Engine

The Cognitive Engine is the centralized reasoning core of the Identity Prism OS. It transforms raw signals (L2) and semantic models (L2.5) into actionable strategic decisions (L3), tuned by persistent persona intelligence (L4).

## 1. Orchestration Pipeline

The engine follows a strict deterministic pipeline defined in `src/lib/cognitive/orchestrator.ts`:

1.  **Stimulus Input**: Accepts an optional `external_input` (snake_case) alongside the selected operating mode.
2.  **Context Assembly**:
    *   Fetches verified entities and relationships from MongoDB.
    *   Fetches high-intensity signals from the L2 buffer.
    *   Aggregates L4 Persona Intelligence (Traits, Styles, Weights) from Postgres.
3.  **Prompt Engineering**: Constructs a structured prompt grounding the LLM in factual context while enforcing the user's specific persona voice ("no fluff, punchy").
4.  **Reasoning Pass**: Executes via `gpt-4o-mini` with strict JSON output schemas.
5.  **Post-Processing**:
    *   **Sanitization**: Values are validated and formatted.
    *   **Deduplication**: Recommendations are checked against recent L3 history to prevent repetitive advice.
6.  **Persistence**: Logs the decision to Neon (Postgres) for the long-term registry.

## 2. Operating Modes

- **Architect**: Focuses on structural durability and systems thinking.
- **Founder**: Focuses on leverage, capital efficiency, and market momentum.
- **Operator**: Focuses on execution velocity and high-impact next steps.

## 3. L4 Persona Integration

The engine is not a generic assistant. It utilizes the `PersonaResolver` to fetch:
- **Traits**: Quantitative behavioral markers (e.g., "Momentum", "Systematic").
- **Style Weights**: Specific linguistic preferences (e.g., "Avoid generic openings").
- **Positioning**: Key keywords that define the user's professional aperture.

## 4. Automation Bridge

Decisions can be "deployed" as artifacts (LinkedIn posts, Memos, etc.) via the `ArtifactGenerator`. These are then pushed to the n8n automation layer through a standardized webhook bridge.

---

> [!NOTE]
> All cognitive logs are stored in the `decision_logs` table in Postgres, enabling retro-active performance audits and L4 model evolution.
