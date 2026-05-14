# Hardening Program

This document defines enterprise hardening scope across security, reliability, governance, and scalability. See `docs/master-roadmap.md` for execution order and acceptance criteria.

## Implemented in this hardening pass

### Security primitives
- `src/lib/security/auth.ts`
- `src/lib/security/roles.ts`
- `src/lib/security/webhooks.ts`
- `src/lib/security/encryption.ts`
- `src/lib/security/rate-limit.ts`

### Security integration
- `POST /api/output/schedule`
  - rate limiting
  - role/permission check (`schedule`)
- `POST /api/output/publish`
  - rate limiting
  - role/permission check (`publish`)

### Caching primitives
- `src/lib/cache/context.ts`
- `src/lib/cache/semantic.ts`
- `src/lib/cache/recommendation.ts`
- `src/lib/cache/output.ts`

### Cost governance primitives
- `src/lib/cost/tracking.ts`
- `src/lib/cost/routing.ts`
- `src/lib/cost/budget.ts`

## Remaining to reach full enterprise hardening
- persistent/distributed rate-limit store (Redis/upstash) instead of in-memory map
- global middleware-level authz enforcement (all privileged APIs)
- immutable provenance ledger and signed lineage records
- DR drills and rollback/replay automated tests
- cache invalidation orchestration and hit-rate observability
