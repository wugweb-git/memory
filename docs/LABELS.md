# Repository Labeling Strategy

To maintain a clean and recyclable codebase, we use the following labels for Pull Requests, Issues, and commits.

## Core Layers
- `layer-1-memory`: Changes affecting the ingestion core or RAG logic.
- `layer-2-processing`: Changes affecting signal extraction or enrichment pipelines.
- `layer-2.5-intelligence`: Changes affecting semantic hardening or intelligence governance.

## Maintenance & Recycling
- `important/recycle`: Identifies code or features that are being deferred but should be revisited for future use.
- `security/audit`: Security-related fixes, secret rotations, or environment hardening.
- `cleanup/purge`: Systematic removal of dead code or stagnant branches.

## Workflow
- `verified/stable`: Indicates a build that has passed all L1/L2 hardening checks.
- `experimental`: High-risk changes that require additional testing before merging to `main`.

## How to use
Apply these labels in GitHub to automate the "Map of the OS" and help the system identify which modules are being updated.
