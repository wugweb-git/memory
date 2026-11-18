# validate-live

Post-deploy smoke check of the live site. Dependency-free, Node >= 20.

```
node scripts/validate-live.mjs [--base https://www.vedanshusrivastava.com] [--json] [--no-chat] [--list]
```

- Default base is the main domain. `*.vercel.app` preview hosts are refused (exit 2).
- Prints a PASS/FAIL/SKIP table; exit code 1 if any check FAILs.
- `--no-chat` skips `/api/chat` (free tier is capped at ~50 requests/day). A default run sends exactly one chat request.
- `VALIDATE_JOB_SECRET=<secret>` enables the authenticated `POST /api/jobs/process` check and reports scanned/embedded/failed. Without it that check is SKIP. The secret is never printed.

Checks: `/ask`, `/login` (200; the "Keep me signed in" text is drawn client-side, so check it in a browser, not in raw HTML); `/api/jobs/process` 401 without secret; `/api/memory/list`, `/api/memory/public`, `/api/health/system` 401; `/api/profile/system_user` isPublished; `/api/showcase` enabled with no `drafts.` ids; `/manifest.json` (name, start_url, maskable icon); `/sw.js` JS content type; `x-vercel-id` header; `/api/chat` SSE (text-delta and [DONE]).

Tests: `npx tsx --test test/hardening/validate-live.test.ts` (mocked fetch; checks are an exported `{name, run(ctx)}` array, `ctx = {base, fetch, env, noChat}`).
