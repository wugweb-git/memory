# Automation
Internal trigger-based orchestration (`src/lib/workflows/engine.ts`) for scheduled publishing,
auto-decisions, rescoring jobs, and maintenance jobs. Triggers are internal — signal spikes, decision
generation, and schedules — with no external automation service (no n8n).
