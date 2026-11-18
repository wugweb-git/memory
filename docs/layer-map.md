# Layer Map
All layers run on a single Neon/Postgres database (MongoDB and Supabase are not used).
- L0: Input/Ingress
- L1: Immutable memory (Neon/Postgres + pgvector)
- L2: Signal stream
- L2.5: Semantic graph
- L3: Decision engine (Neon)
- L4: Persona/behavioral intelligence (Neon/Postgres)
