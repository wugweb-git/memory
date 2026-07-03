# Component audit — `src/app/component/`

Snapshot of every component and whether it's mounted. **Orphaned ≠ junk** — most
are feature-complete and API-wired; they were built ahead of the routes that
would host them. This is a backlog map, not a delete list. Keep all.

Reachability computed from pages/API/middleware imports.

## Mounted (in use)
| Component | Used by | Notes |
|---|---|---|
| `AppShell` | every internal route | Canonical chrome (sidebar + topbar + dock). |
| `ThemeProvider` | layout | Theme context. |

## Orphaned — career / profile cluster (high value, profile-facing)
| Component | Data source | Recommendation |
|---|---|---|
| `ExperienceMatrix` | `byType('experience')` | **Wired into `/p/[username]` as the "Career" timeline (2026-07).** Original component kept for internal/admin reuse. |
| `VentureVault` | `byType('venture')` | Ventures grid — profile already renders ventures inline; reuse for an internal ventures manager. |
| `ProfileHeader` | `byType('venture')` + identity | Rich header; superseded on public profile by the redesign. Candidate for the in-app profile editor. |
| `IdentityShowcase` | `byType(blog/published/reference)` | Overlaps the profile's Writing/Selected-work + Sanity showcase. |
| `JobPipeline` | `/api/blob?type=job_application` | Career: application tracker. Needs a `/career` or `/jobs` route to host. |
| `JobSearchAgent` | `/api/blob?type=job_lead` | Career: lead discovery. Same host route as JobPipeline. |

## Orphaned — ingestion / memory features (API-wired, just unmounted)
| Component | Data source | Recommendation |
|---|---|---|
| `VoiceIngestion` | `/api/blob`, `/api/cognitive/evaluate` | Voice capture → intake. Strong add to `/buffer` or a capture surface. |
| `KnowledgeSource` | `/api/upload` | File/knowledge upload widget. Fold into `/memory` or `/buffer`. |
| `UniversalSync` | `/api/blob?type=external_link` | External link/source sync. Fits an Integrations screen. |
| `InspirationHub` | `/api/blob?type=inspiration` | Inspiration board. Optional surface. |
| `ActivityLog` | `/api/memory/signals` | Activity feed — good Console or Memory widget. |
| `BlobBuffer` | `/api/blob/*` | Alternative buffer UI (promote/reject/review). Overlaps `/buffer`. |
| `MemoryVault` | `/api/memory/list`,`/packets` | Memory browser — overlaps `/memory`. |
| `MemoryVaultWithUpload` | `/api/memory/*`,`/api/upload` | Memory browser + upload (508 lines, most complete). Merge into `/memory`. |
| `NeuralConnections` | `/api/health/system` | System-connections viz. Console/System widget. |
| `EnhancementHub` | `/api/cognitive/decide` | Suggested next actions from the brain. Console widget. |

## Orphaned — chrome superseded by AppShell
| Component | Notes |
|---|---|
| `Sidebar`, `TopNav`, `navbar`, `MobileNav` | Older nav variants; `AppShell` replaced them. Keep for reference or delete once confident. |
| `AuthPanel` | Login/logout panel; superseded by the new `/login` route (2026-07) but still valid as an embeddable widget. |
| `IntegrationMatrix` | Integrations UI mock (static). Repurpose when Integrations screen lands. |
| `IdentityPillars`, `IndustryBento` | Config-driven marketing blocks for the profile/landing. Decorative. |
| `ThemeToggle` | Light/dark toggle — product is light-first; dormant. |

## Deprecated (safe to remove eventually)
| Component | Notes |
|---|---|
| `StatusHUD` | 4-line tombstone: "deprecated — replaced by Sidebar". |

## Suggested next hosts
- **`/career`** (new): `ExperienceMatrix` (internal editor) + `JobPipeline` + `JobSearchAgent` → the full career tree, admin-side, feeding the public profile's Career section.
- **`/memory`**: merge `MemoryVaultWithUpload` + `KnowledgeSource`.
- **`/buffer`**: add `VoiceIngestion`.
- **Console**: `ActivityLog` + `EnhancementHub` widgets.
