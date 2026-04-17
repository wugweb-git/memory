# Layer 2.5: Semantic Enrichment & Intelligence (LOCKED)

Layer 2.5 represents the **Hardened Intelligence** layer of the Identity Prism OS. It is responsible for semantic accuracy, environment governance, and multi-entity reconciliation. This layer has been certified as **LOCKED** after a comprehensive production-grade hardening.

## 🏗️ Architectural Guarantees

### 1. 🛡️ Environment Isolation (test_run_id)
To prevent cross-pollution between test environments and production, Layer 2.5 enforces strict scoping:
- **Scoped Models**: Every database entry (Entities, Relationships, Signals, Patterns) contains a `test_run_id`.
- **Retrieval Guard**: Vector search and read APIs explicitly filter by `test_run_id`, ensuring a logical "Prism" between test and production data.
- **Cleanup Automation**: Native support for purging environment-scoped data via administrative scripts.

### 2. ⚛️ Atomic Write Isolation (Simulation)
In deployments without native MongoDB transactions, Layer 2.5 ensures data consistency through an application-level state machine:
- **Pending Persistence**: All semantic objects are created with `processing_state: "pending"`.
- **Read-Time Shielding**: Only objects with `processing_state: "complete"` are visible to read paths.
- **Atomic Promotion**: The entire semantic graph for a packet is flipped to `complete` only after reconciliation and relationship creation are successful.

### 3. ⚔️ Concurrency & Identity Management
Layer 2.5 uses a robust "Manual Upsert" pattern to handle high-concurrency ingestion:
- **Deterministic Identity**: Uses `dedup_hash` (content-based hash + `test_run_id`) to prevent duplicate entity creation.
- **Race Condition Guard**: Implements `isUniqueError` handling to detect and resolve simultaneous creation attempts across sharded workers.

## 🚀 Key Components

### 🧠 Semantic Engine
The core logic for extracting high-fidelity entities and relationships. It handles the "Promote to Verified" flow for normalized entities.

### 🤝 Reconciler
Analyzes incoming semantic objects and merges them into the canonical graph, updating occurrence counts and last-seen timestamps while maintaining strict `test_run_id` isolation.

### 🩺 Diagnostic Audit API
A 20-point diagnostic suite (`/api/admin/semantic-diagnose`) that certifies system invariants, including isolation, concurrency safety, and graph integrity.

## 📈 Status: LOCKED
As of April 2026, Layer 2.5 is considered a stable foundation for the upcoming **Layer 3: Action Engine**.
