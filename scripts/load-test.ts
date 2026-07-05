#!/usr/bin/env tsx
/**
 * Minimal load test — no external deps. Hits the hot read paths with
 * concurrent batches and reports latency percentiles + error rate.
 *
 * Usage:
 *   BASE_URL=https://memory-wugweb.vercel.app npx tsx scripts/load-test.ts
 *   npx tsx scripts/load-test.ts http://localhost:3000 [concurrency] [totalRequests]
 *
 * This intentionally stays read-only and unauthenticated-safe (health +
 * public endpoints only) so it's harmless to point at production.
 */

const BASE_URL = process.argv[2] || process.env.BASE_URL || "http://localhost:3000";
const CONCURRENCY = Number(process.argv[3] || 10);
const TOTAL = Number(process.argv[4] || 100);

const ROUTES = [
  "/api/health/system",
  "/api/health/output",
  "/api/health/recommendation",
  "/api/showcase",
];

type Result = { route: string; ms: number; status: number; ok: boolean };

async function hit(route: string): Promise<Result> {
  const start = performance.now();
  try {
    const res = await fetch(`${BASE_URL}${route}`);
    return { route, ms: performance.now() - start, status: res.status, ok: res.ok };
  } catch {
    return { route, ms: performance.now() - start, status: 0, ok: false };
  }
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return Math.round(sorted[idx]);
}

async function main() {
  console.log(`Load test: ${BASE_URL} — ${TOTAL} requests, concurrency ${CONCURRENCY}`);
  const results: Result[] = [];
  let launched = 0;

  while (launched < TOTAL) {
    const batchSize = Math.min(CONCURRENCY, TOTAL - launched);
    const batch = Array.from({ length: batchSize }, () => hit(ROUTES[launched++ % ROUTES.length]));
    results.push(...(await Promise.all(batch)));
  }

  console.log("\nPer-route summary:");
  for (const route of ROUTES) {
    const rows = results.filter((r) => r.route === route);
    const times = rows.map((r) => r.ms).sort((a, b) => a - b);
    const errors = rows.filter((r) => !r.ok).length;
    console.log(
      `  ${route.padEnd(32)} n=${rows.length.toString().padEnd(4)} p50=${percentile(times, 50)}ms p95=${percentile(times, 95)}ms p99=${percentile(times, 99)}ms errors=${errors}`,
    );
  }

  const totalErrors = results.filter((r) => !r.ok).length;
  console.log(`\nTotal: ${results.length} requests, ${totalErrors} errors (${((totalErrors / results.length) * 100).toFixed(1)}%)`);
  if (totalErrors > 0) process.exitCode = 1;
}

main();
