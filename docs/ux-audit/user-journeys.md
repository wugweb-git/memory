# Identity Prism OS: live user-journey audit

Target: https://www.vedanshusrivastava.com (production, signed in as owner). Date: 2026-11-19.
Method: built-in Browser pane, own tab, 375x812 mobile emulation (the pane reset the emulation several times; it was re-applied before each batch). Read-mostly. The only write was one `[ux-test]` buffer capture, which was purged through the UI (see J2).

Status legend: works / degraded (usable but wrong, misleading or rough) / broken (contradicts reality, or fails) / untested.

Context caveats: the free AI model quota was exhausted during the run (OpenRouter `free-models-per-day` 429), so Ask, Decide and the retrieval tester legitimately fail. The live site is behind `main` in this worktree (commits such as the nested-route back control are not live yet), so some items may already be fixed on `main`.

## Repo script: `node scripts/validate-live.mjs https://www.vedanshusrivastava.com`

PASS 11, FAIL 1, SKIP 1.
- FAIL: `POST /api/chat streams (1 request)`, "no text-delta data line". Consistent with the exhausted model quota (J3 shows the same failure in the UI).
- SKIP: `POST /api/jobs/process with secret` (VALIDATE_JOB_SECRET not set).
- All other checks pass: /ask 200, /login 200, protected routes 401, profile published, showcase has no drafts, manifest valid (3 icons incl. maskable), /sw.js JavaScript 200.

Horizontal overflow at 375px: 0px on every page visited (console, more, ask, memory, buffer, history, cognitive, persona, career, portfolio, content, integrations, credentials, publishing, system, admin, admin/memory, admin/memory/public, admin/profile, p/system_user, offline, 404).

## J1 First load and navigation

| # | Action | Expected | Observed | Status |
|---|---|---|---|---|
| 1 | Load /console | Shell, h1, next actions | Title "Console \| Identity Prism", h1 "Console", 5 next-best-action cards, overflow 0 | works |
| 2 | Bottom bar Console/Memory/Content/Buffer/More | Each opens its route, `aria-current` follows | /console, /memory, /content, /buffer, /more; titles and `aria-current` correct. Note /content h1 is "Output studio" while the title and tab say "Content" | works |
| 3 | More list, 16 rows | Each row opens the right route and title | All 16 hrefs resolve 200 with correct SSR titles (Console, Ask, Memory, Buffer, History, Cognitive, Persona, Career, Content, Portfolio, Profile, Integrations, Integration credentials, Publishing accounts, System, Admin) | works |
| 4 | Direct load /more | Title "More \| Identity Prism" | First direct load showed "Identity Prism \| Neural OS" (generic); a later load and the raw HTML show the correct title. Likely a stale cached shell from the service worker | degraded |
| 5 | Top-bar profile eye | Opens public profile | Link to /p/system_user, same tab (no `target`). On a phone it leaves the app shell and relies on browser back | degraded |
| 6 | Account menu | Email, role, Account and security, Admin, Sign out | Opens, focus handling OK, items present (Sign out not pressed) | works |
| 7 | Back behaviour | Back returns to parent | History back from /integrations and /cognitive returns to /more. No in-page back control on nested routes (/integrations/credentials, /integrations/publishing) on live. /ask back arrow goes to the public profile, not the Console the owner came from | degraded |
| 8 | Deep links, 22 routes by URL | 200 and correct title | All 200, SSR titles correct. /p/system_user SSR h1 is "Loading profile" (client-rendered) | works |
| 9 | 404 `/this-page-does-not-exist` | Branded not-found with a way home | HTTP 404 is correct, but it is the stock Next.js page: "404 / This page could not be found.", no link, no shell, title "404: This page could not be found." | degraded |
| 10 | Overflow at 375px, all pages | 0 | 0 on every page | works |

## J2 Capture to memory

| # | Action | Expected | Observed | Status |
|---|---|---|---|---|
| 1 | /buffer, Add item | Capture panel | Panel opens at the bottom of the 50-item list (long scroll). Tabs: Upload, Voice, Files, Link, Pulse, Device, Import. There is no plain "note" tab; text capture is the Voice tab | works |
| 2 | Voice tab, empty then `[ux-test] audit capture note, safe to delete` | Disabled until text, then capture | "Capture Signal" disabled when empty. After text it shows a parse preview (What, When, Why, Method) with "Anchor to Buffer" | works |
| 3 | Anchor to Buffer | Success feedback, item appears in list | `/api/blob` total went 51 to 52 (item `ddf50b83`, state raw). No visible success message and the list did not refresh; the item only appeared after reload | degraded |
| 4 | Open the item in Buffer | Detail with actions | Inline "Item details": Mark reviewed, Mark ready to promote, Promote to memory (visually the primary button), Reject and purge, payload JSON | works |
| 5 | Reject and purge, confirm, purge | Item deleted | Confirm sheet appears with focus on "Keep item". Toast "Item rejected and purged." and the sheet says "deleted from the buffer for good and can't be recovered". But `/api/blob` still returns the record with `state: rejected` and the full `raw_payload`. It is a soft reject, not a purge | broken |
| 6 | Buffer list size | All items, pagination | Header "Showing 50 items" while the API total is 52. UI requests `limit=50`, no Load more or page control, so 2 items are unreachable | broken |
| 7 | /memory (packets view) | Search, filter | Status and Source text filters, packet list. Counters inconsistent with admin (see defect 10) | degraded |
| 8 | /admin/memory explorer type filter | Filter by packet type | Select works (Document returns 20, Email and Note return "No ... packets"). Options are only Email, Activity, Document, Note, but real packets are blog, external, voice_note, device_geolocation, github, so most types cannot be filtered | degraded |
| 9 | Explorer pagination | Page indicator, Previous disabled on page 1, Next disabled at end | No page indicator or total. Previous is enabled on page 1 (stays on page 1). Next kept returning 20 rows for 4 consecutive pages although the UI reports 54 packets | broken |
| 10 | Retrieval tester: 2 chars, then "projects" | Validation, then results or clear error | "Enter at least 3 characters." works. The real query fails with the raw provider text: "Retrieval failed: 429 Rate limit exceeded: free-models-per-day. Add 10 credits ... openrouter.ai ... docs.langchain.com ... Check that you are signed in as admin" (HTTP 500). Leaks provider URLs and gives wrong advice | degraded |
| 11 | Inspect a packet | Read-only detail | Dialog with content, "No signals interpreted yet", "No semantic enrichment yet" | works |
| 12 | Cleanup | Test item gone | Item remains as `rejected` (no UI delete exists). Left in place; id `ddf50b83-cc8b-4db8-ad68-b3da1771f9a5`, payload prefix `[ux-test]` | degraded |

## J3 Ask your memory

| # | Action | Expected | Observed | Status |
|---|---|---|---|---|
| 1 | /ask (signed in as owner) | Owner ask experience | Shows the public chat: "What would you like to know about Vedanshu's work?", "Answers come from published notes". Header back arrow is "Back to Vedanshu's profile". The Console card "Ask your memory" lands here, so the owner cannot tell whether private memory is queried | degraded |
| 2 | Starter questions | 4 starters, tap sends | 4 starters shown; tapping one sends a message | works |
| 3 | Error state (quota) | Clear, recoverable | After about 10 s: "The answer did not come through. Check your connection, then tap Retry." with a Retry button. Recoverable, but blames the connection when the cause is the provider (`POST /api/chat` returned 200 then aborted) | degraded |
| 4 | Composer, Enter, Send | Send on Send | Enter inserts a newline under the touch UA (messenger convention); the Send button sends | works |
| 5 | Stop | Cancels | "Stop answer" appeared immediately; after pressing it the thread shows "Stopped. Tap Retry to ask again." plus Retry | works |
| 6 | More options | Clear chat | Menu has Clear chat only (not pressed) | works |
| 7 | Citations | Shown when present | Not verifiable, no successful answer during quota exhaustion | untested |

## J4 Decision engine /cognitive

| # | Action | Expected | Observed | Status |
|---|---|---|---|---|
| 1 | Tabs Decide, Evaluate, Rank, Gaps, History | All render | All five render, no overflow | works |
| 2 | Evaluate validation | Disabled under 10 chars | Button disabled, helper "Add at least 10 characters to evaluate", live counter | works |
| 3 | Rank validation | Max 10 items | 0 lines disabled; 12 lines gives "12 of 10 items (remove some to continue)" and disabled | works |
| 4 | Gaps | Coverage report | "Profile coverage 10%", 6 domains missing, entity table, "Run the coverage check again". `POST /api/cognitive/gaps` 200 | works |
| 5 | History | Timeline | One entry: "Poor Fit, 13:23 architect 30% confident ignored" (SUN 5 JUL) | works |
| 6 | Decide, Get direction (1 run) | Direction or clear error | `POST /api/cognitive/decide` 502 `{"error":"Decision Engine failure"}`. UI: "Decision Engine failure" and "Try again". Recoverable but cryptic and no cause (quota) | degraded |

## J5 Persona, career, portfolio

| # | Action | Expected | Observed | Status |
|---|---|---|---|---|
| 1 | /persona view | Profile and timeline | Rich view (confidence 98%, voice, traits). Timeline shows a raw "Evidence marker scheduled_evolution:abc842b7..." row. 13 "Roll back" buttons each have a descriptive aria-label | works |
| 2 | Roll back, open confirm, cancel | Confirm sheet | alertdialog "Roll back this change?" with Keep current value / Roll back. Cancelled. Focus is not returned to the trigger afterwards | works |
| 3 | /career view | Real career tree and real leads | Tree is real (3 roles). The "Opportunities / Leads and outreach" block shows hardcoded cards: "94% Principal Systems Architect, Solana Labs, Applied", "88% Staff UX Product Designer, Revolut, Live", "91% AI Engineering Lead, Anthropic, Pending", "Agent: Nominal", while the same page says 0 applications captured | broken |
| 4 | Add role, submit empty | Validation | "Enter the role title." shown, required field flagged | works |
| 5 | Add role, Cancel | Closes | Form closes, nothing saved | works |
| 6 | /portfolio | Lists projects, cases, blog | Tabs Projects (2), Case studies (1), Blog (1). The "Atlas ..." project is tagged `sample` and is live on the public profile | degraded |
| 7 | Persona adaptive interface, feedback | Controls | UI density, output length, navigation, mode chips; Accepted/Rejected/Ignored feedback (not submitted) | works |

## J6 Content and output studio

| # | Action | Expected | Observed | Status |
|---|---|---|---|---|
| 1 | /content Compose | Stepper, decision, format | 3-step stepper, recent decision, 8 formats, Generate draft (not run) | works |
| 2 | Live (11) | Real published sections | Lists sections but includes dev and sample content: "Neon-backed profile is live ... not Mongo", an empty "Testimonial", "(sample)" talk, raw `**Generating Output**` markdown | degraded |
| 3 | Drafts (3) | Draft list | 3 drafts listed; opening one shows editor, preview, "Publish to profile" (primary), Save draft, Add to queue. Not pressed | works |
| 4 | Queue tab | Queue visible | No Queue tab or status list in the studio (only Compose, Live, Drafts). System output health shows `queued: 0` | degraded |
| 5 | /history | Published history, readable | Entry "Blog, 19 Nov 2026 07:41, Not sent: error, UNSUPPORTED_PLATFORM:blog" shows a raw error code | degraded |
| 6 | Publishing buttons | Exist, labelled | Present; confirm not exercised, nothing published | works |

## J7 Integrations

| # | Action | Expected | Observed | Status |
|---|---|---|---|---|
| 1 | Summary banner | Accurate | "Everything you connected is working. 1 working, 0 need attention, 12 not set up" | degraded |
| 2 | Source rows (GitHub, YouTube, Blog, Notion, Spotify, iCloud, 7 manual, 7 credential-gated) | Status, last sync, action | All render with status. GitHub: "Synced 6 h ago. 24 new, 1 skipped. Runs every 2 h" (stale for a 2 h schedule; System health says github "Idle, last_sync —") | degraded |
| 3 | GitHub Change form | Prefilled | Opens (Save and sync, Cancel). Username field is empty (placeholder "octocat") although GitHub is working | degraded |
| 4 | YouTube Set up, empty | Validation | "Save and sync" disabled while empty | works |
| 5 | Add a feed with `not a url` | Clear validation | `POST /api/sources/feeds` 400, message "Enter a full web address, like https://example.com/feed." Nothing saved | works |
| 6 | Notion, Spotify, iCloud, Google rows | Action to connect | Text tells the user to "set NOTION_TOKEN" etc. in env, with no button, though the credentials page exists | degraded |
| 7 | /integrations/credentials | Renders | 6 password/text fields, banner "Tokens can't be saved yet: set MEMORY_ENCRYPTION_KEY". Seven or six identical "Save" buttons with no aria-label. Nothing saved | works |
| 8 | /integrations/publishing | Renders | LinkedIn, X, Facebook, Instagram, Medium, same banner, 7 unlabeled "Save" buttons. Nothing saved | works |
| 9 | Notifications card | Status and toggle | "Off for this device. Notifications are blocked for this site" with Turn on | works |
| 10 | Sync now | read-only source only | Not pressed: a sync writes new buffer items, so it is not clearly read-only | untested |

## J8 System and admin

| # | Action | Expected | Observed | Status |
|---|---|---|---|---|
| 1 | /system modules | Toggles | 9 module switches, "Only the owner can change them" (not toggled) | works |
| 2 | Health checks | Readable | Four raw JSON dumps (system, persona, output, recommendation). `status: "DEGRADED"`, `core_integrity: "VERIFY"` with no explanation. Lists test integrations (dedupe_test, race_test, loop_test ...) | degraded |
| 3 | Layers status | Layer view | No separate layers card exists; only the JSON | degraded |
| 4 | Cost card | Usage | "31 of 50 free requests used today", per-job rows (Ask 21/25, Decision 6/12 ...). Copy tells the owner to change `DAILY_BUDGET_ASK` env vars | works |
| 5 | Passkeys card | List and add | Existing passkey ("Nothing, added 19 Nov 2026, last used never") with Remove, Add this device (not pressed) | works |
| 6 | /admin | Operations and health | Page renders; shortcuts work. "Health" says "All subsystems are healthy." while the System row shows DEGRADED | broken |
| 7 | /admin setup checklist | Real onboarding | "Setup checklist (11/14)" is made of placeholder jargon ("Enable dynamic pricing nodes", "Deploy Service Lattice", "Harden L4 Logic Gates", "Achieve Matrix Alignment") and every row's text starts with a check glyph | broken |
| 8 | /admin/memory, /admin/memory/public, /admin/profile | Open and list | All open and list. Public notes: "0 of 54 public"; the list includes device_geolocation notes (lat/long) with a Make public control | works |
| 9 | Run diagnostics, Audit memory, Run jobs now | Exist | Present and labelled ("Run jobs now ... This changes data"). Not pressed | works |

## J9 Public surface

| # | Action | Expected | Observed | Status |
|---|---|---|---|---|
| 1 | /p/system_user (signed-in view) | Polished public page | Renders without overflow, generated avatar. Contains: "Get in touch" mailto `system@identity-prism.local`, raw `**Generating Output**` markdown, the dev note "Neon-backed profile is live ... not Mongo", placeholder links to `example.com/atlas` and `example.com/talk`, project links to `memory-git-main-wugweb.vercel.app` and `memory-wugweb.vercel.app` | broken |
| 2 | Profile SSR | Server HTML has content | SSR h1 is "Loading profile"; content only after client fetch of `/api/profile/system_user` | degraded |
| 3 | Links | Real | Twitter, LinkedIn, GitHub, Portfolio present and open in new tab | works |
| 4 | Public /ask behaviour | Public chat | Same chat as J3; "Ask my digital twin" link on profile goes to /ask | works |
| 5 | /offline | Reachable | 200, h1 "You are offline", Retry connection button, title "Offline \| Identity Prism" (copy says "Prism OS", elsewhere "Identity Prism") | works |

## J10 PWA and resilience

| # | Action | Expected | Observed | Status |
|---|---|---|---|---|
| 1 | Service worker | Registered | 1 registration, scope `/`, state activated, script `/sw.js`, cache `prism-static-v4`, SW references /offline | works |
| 2 | Manifest | Valid | 200 `application/json`, name "Identity Prism OS", short "Prism OS", standalone, start `/console`, 3 shortcuts, 3 icons all 200 (192, 512, maskable). Dark and light theme-color both `#F5F5F0` | works |
| 3 | Install prompt | Component shows | Synthetic `beforeinstallprompt` shows an "Install Prism OS" card with Install and dismiss. It overlaps page content above the bottom bar | works |
| 4 | Connectivity toast | Offline and back online | The tool has no network emulation; dispatching `offline` and `online` events showed "You are offline. Changes will not sync." then "Back online" (simulated, not true network loss) | works |
| 5 | Console errors across run | None unexpected | Only expected errors: 502 (decide/chat), 500 (retrieval 429), 400 x2 (bad feed), 404 x2 (404 probe). About 20 repeated warnings that two preloaded CSS files are unused. A persistent live region with text "Active" is announced on every page | degraded |

## Tally

| Status | Count |
|---|---|
| works | 44 |
| degraded | 24 |
| broken | 7 |
| untested / not exercised | 2 |

Not exercised on purpose (safety rules): Sync now, any Publish / Add to queue, Roll back confirm, Regenerate persona, Run jobs now, module toggles, passkey add/remove, credential saves, sign out.

## Ranked defects

Severity: High = wrong or misleading in a way the owner or visitors will act on; Medium = confusing or inconsistent; Low = polish.

| # | Sev | Journey, step | Evidence | Suspected file | Suggested fix |
|---|---|---|---|---|---|
| 1 | High | J5.3 Career | Hardcoded lead cards (Solana Labs, Revolut, Anthropic; 94/88/91%; "Agent: Nominal") shown as real opportunities beside "0 applications captured" | `src/app/component/JobSearchAgent.tsx` | Remove the mock array; render real data or an honest empty state |
| 2 | High | J9.1 Public profile | "Get in touch" mailto `system@identity-prism.local` (invalid domain) | `src/config/identity.ts:20` | Use the owner's real address from env or profile data; hide the button if unset |
| 3 | High | J9.1, J6.2 Public profile and Live tab | Raw `**Generating Output**` markdown; dev note "Neon-backed profile is live ... not Mongo"; example.com sample links; links to pre-promote `memory-git-main-wugweb.vercel.app` and `memory-wugweb.vercel.app` | `src/app/p/[username]/PublicProfileView.tsx`, `scripts/seed-dummy-showcase.mjs`, profile rows in Neon | Render markdown (or strip it); delete sample and dev sections; point project links at the canonical domain |
| 4 | High | J2.10, J8.2 Embeddings | Admin: 8 of 54 embedded, 26 failed, 20 backlog; retrieval tester 429; memory not searchable; also drives Ask failure | `src/lib/memory/**` embedder, `src/app/admin/memory/components/RagTester.tsx` | Add credits or a fallback embedder; auto-retry failed packets; show "Search is paused because the free model quota is used up" |
| 5 | High | J2.5 Buffer purge | Copy says deleted for good; the API still returns the item with `state: rejected` and raw payload | `src/app/buffer/page.tsx:314,342`, blob reject route | Either hard-delete on purge or reword to "Reject (kept for 30 days)" |
| 6 | Medium | J8.6 Admin health | "All subsystems are healthy." next to System = DEGRADED | `src/app/admin/page.tsx:194` | Derive the sentence from the worst status; explain what DEGRADED means |
| 7 | Medium | J8.7 Admin checklist | Placeholder jargon items, all rows show a check glyph though 11/14 | `src/config/ui-content.ts:~238-252`, `src/app/admin/page.tsx:212` | Replace with the real setup steps; icon only when completed |
| 8 | Medium | J2.8-2.9 Memory explorer | Type filter lacks real types; no page indicator; Previous enabled on page 1; Next never ends | `src/app/admin/memory/components/MemoryExplorer.tsx:114,238` | Build options from data; return total and disable Previous/Next; show "Page x of y" |
| 9 | Medium | J2.3, J2.6 Buffer list | Capped at 50 of 52, no pagination; list and counters stale after capture; no success message | `src/app/buffer/page.tsx:142` | Pagination or infinite load; refetch and toast after anchor |
| 10 | Medium | J2.7, Console Counts | Console "30 raw, 22 not searchable"; Memory "12 need attention, 54 packets"; admin "26 failed, 20 backlog"; blob total 52; system 56 packets | Console, `/memory`, admin APIs | One shared stats source and shared definitions |
| 11 | Medium | J3.3, J4.6 AI errors | Ask: "Check your connection" for a provider failure; Decide: "Decision Engine failure"; retrieval leaks provider URLs and HTTP 500 | `src/app/ask/page.tsx:52`, `src/app/api/cognitive/decide/route.ts:45`, `RagTester.tsx:47` | Map 429/quota to "The AI service is at its daily limit, try tomorrow"; never show raw provider text |
| 12 | Medium | J8.2 System health | Four raw JSON blobs, test integrations listed, github "Idle, last_sync —" vs integrations "Synced 6 h ago" | `src/app/system/**` | Humanize, hide test sources, reconcile last-sync source |
| 13 | Medium | J7.1, J7.6 Integrations | "Everything you connected is working" with 12 not set up; rows tell the owner to set env vars though a credentials page exists; GitHub 6 h since sync on a 2 h schedule | `src/app/integrations/page.tsx:346`, `src/lib/ingestion/connectors/notion.ts:42` | Link rows to the credentials page; reword the banner; investigate the scheduler |
| 14 | Medium | J2 Capture, J5 Career | Leftover jargon and all-caps: NEURAL_UPLINK_BRIDGE, COGNITIVE INGRESS, "Anchor to Buffer", "Powered by FilePond", "Neural Parser", "Find_Roles" | `src/app/component/VoiceIngestion.tsx`, `KnowledgeSource.tsx`, `JobSearchAgent.tsx` | Plain sentence-case copy, per `docs/design.md` |
| 15 | Medium | J1.9, J9.2, J3.1 | Stock unbranded 404; public profile SSR is "Loading profile" (bad for SEO and link previews); owner /ask is the public chat and its back arrow leads to the public profile | `src/app/not-found` (missing), `src/app/p/[username]/PublicProfileView.tsx:72`, `src/app/ask/page.tsx` | Add `not-found.tsx` with shell and home link; server-render profile; owner mode for /ask |
| 16 | Low | J6.5 History | Raw "UNSUPPORTED_PLATFORM:blog" | `src/lib/publishing/delivery.ts:85`, `src/lib/distribution/router.ts:38` | "Blog posts are saved here, not sent to a platform" |
| 17 | Low | J7.3 GitHub Change form | Username field not prefilled | `src/app/integrations/page.tsx` | Return and prefill the saved username |
| 18 | Low | J1.7 Nested routes | No back control on /integrations/credentials and /publishing on live; eye link opens same tab | AppShell (fixed by commit 405b388 on this branch, not live) | Promote the build |
| 19 | Low | J10.5, J5.2, J7.7 a11y | Persistent "Active" live region; focus not restored after dialog; identical unlabeled "Save" buttons on credential pages | `src/app/component/AppShell.tsx`, credentials page | Remove stray live region; restore focus; add per-field aria-labels |
| 20 | Low | J8.8 Public notes | device_geolocation (coordinates) packets are listable with "Make public" | `src/app/admin/memory/public/**` | Exclude or warn for location packets |
| 21 | Low | J5.1 Persona | Raw `scheduled_evolution:<hash>` evidence marker | `src/app/persona/**` | Hide internal markers |

## What works

- App-style navigation: bottom bar, More list (16 rows), account menu, deep links (22 routes, all 200 with correct titles), zero horizontal overflow at 375px on every page.
- Form quality where it exists: Evaluate and Rank validation, Add role validation, feed URL validation, YouTube save gating, capture gating.
- Safe destructive flows: Roll back and Purge both use focused confirm sheets (default is the safe option).
- Error recovery in Ask: clear banner, Retry, Stop, "Stopped" state.
- PWA: service worker active, manifest valid with maskable icon and shortcuts, offline page, install card, connectivity toast.
- Auth hygiene: protected API routes return 401 when signed out (validate-live).
- Credentials and publishing pages render with a clear "MEMORY_ENCRYPTION_KEY" blocker and no token saved.
