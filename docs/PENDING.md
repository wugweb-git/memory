# Pending / follow-up

All audit backlog items are **complete**. Components were **restored and wired**, not removed.

## Completed

- [x] `MemoryVault.tsx` — restored; loads `/api/memory/list`, wired in Memory section as Fragment Browser
- [x] `JobSearchAgent.tsx` — restored; loads `/api/blob?type=job_lead`, wired in Profile section
- [x] JWT auth + Settings **AuthPanel** UI
- [x] Public health: `/api/health/system`, `/persona`, `/output`, `/recommendation`
- [x] Admin middleware + profile/sources seed
- [x] Broken `href="#"` links fixed in admin pages
- [x] ESLint aligned with Next 15

## Optional next steps

- [ ] OAuth callbacks for Behance/Dribbble when credentials are available
- [ ] Dedicated `/docs` page for API map (file lives in `docs/API_ENDPOINTS.md` in repo)
