# Identity Prism POS

Identity Prism is a Personal Cognitive Operating System (POS). It is not a dashboard; it is a Decision Console designed to observe, understand, evolve, and execute alongside its user.

## System Philosophy
- **L1 (Truth)**: What happened.
- **L2 (Signals)**: What it means.
- **L2.5 (Semantic Graph)**: What connects.
- **L3 (Decision)**: What matters next.
- **L4 (Digital Twin)**: Who you are becoming.

## Core Architecture
- **Layer 1-2.5 (Facts)**: Resides in MongoDB for flexible, high-velocity ingestion and semantic mapping.
- **Layer 3-4 (Intelligence)**: Resides in Neon (Postgres) for structured decision logging and behavioral model persistence.

## Modules
### Cognitive Engine (L3)
A deterministic reasoning loop that handles Context Building, Structured Prompting, LLM Execution (via gpt-4o-mini), Sanitization, and Deduplication.

### Persona Intelligence (L4)
A multi-layered user model including:
- **Behavior Models**: Patterns detected from daily activity.
- **Trait Scores**: Quantitative personality and strategy markers.
- **Style Learning**: Enforced voice and tone weights ("no fluff, punchy").

### POS Decision Console
A porcelain-themed operational surface (PWA & Desktop) for real-time synthesis, signal monitoring, and artifact distribution.

## Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Database**: MongoDB (Semantic) + Neon/Postgres (Behavioral)
- **AI**: LangChain + GPT-4o / GPT-4o-mini
- **Observability**: Langfuse
- **Automation**: n8n Bridge

---
*Identity Prism: The evolution of the second brain.*
