# Layer 2: Signal Interpretation Engine

Layer 2 provides the interpretation and categorization logic that transforms raw Layer 1 MemoryPackets into structured behavioral telemetry (**Signals**).

## Interpretation Surface

### 1. Signal Extraction
- **Telemetry Extraction**: Automatically identifies the category (e.g., productivity, health, social), intensity, and confidence of events within a packet.
- **Intensity Scoring**: Calculates both absolute and relative intensity based on historical baselines.
- **Scoping**: All signals are produced with a mandatory `test_run_id` to maintain system-wide isolation.

### 2. Behavioral Patterns
- **Intelligence Pipelines**: Aggregates signals across Windows (7d, 30d, All) to detect recurring behavioral patterns (e.g., Peak Work Hours).
- **Descriptive Insights**: Generates the "How" and "Why" behind the data, feeding the Intel Panel in the UI.

### 3. Diagnostic Observability
- **Signal Timeline**: Real-time visualization of extracted signals and their categories.
- **Intensity Monitor**: Tracks relative intensity shifts over time to alert on behavioral anomalies.

## Hardening Transition
Layer 2 signals are strictly **transitional** data. They feed the **Layer 2.5 Semantic Enrichment Engine**, which performs the final, hardened reconciliation and relationship mapping before data becomes visible to the end-user.
