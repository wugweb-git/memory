/**
 * Load smoke test — dependency-free concurrent probe of the key read paths.
 *
 * Usage:
 *   node scripts/load-test.mjs [baseUrl] [concurrency] [requestsPerEndpoint]
 *   node scripts/load-test.mjs http://localhost:3000 20 100
 *
 * Reports p50/p95/p99 latency, error rate, and throughput per endpoint.
 * Intentionally read-only: no writes, safe against prod.
 */

const base = process.argv[2] ?? 'http://localhost:3000';
const concurrency = Number(process.argv[3] ?? 20);
const perEndpoint = Number(process.argv[4] ?? 100);

const ENDPOINTS = [
  '/api/health/system',
  '/api/recommendations',
  '/api/showcase',
  '/api/memory/stats',
  '/api/persona/profile',
  '/api/system/features',
];

function pct(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[idx];
}

async function hammer(path) {
  const latencies = [];
  let errors = 0;
  let inFlight = 0;
  let sent = 0;
  const started = performance.now();

  await new Promise((resolve) => {
    const pump = () => {
      while (inFlight < concurrency && sent < perEndpoint) {
        sent++;
        inFlight++;
        const t0 = performance.now();
        fetch(base + path)
          .then((r) => {
            if (!r.ok) errors++;
            return r.arrayBuffer();
          })
          .catch(() => { errors++; })
          .finally(() => {
            latencies.push(performance.now() - t0);
            inFlight--;
            if (latencies.length === perEndpoint) resolve();
            else pump();
          });
      }
    };
    pump();
  });

  const wall = performance.now() - started;
  latencies.sort((a, b) => a - b);
  return {
    path,
    requests: perEndpoint,
    errors,
    rps: Number((perEndpoint / (wall / 1000)).toFixed(1)),
    p50: Math.round(pct(latencies, 50)),
    p95: Math.round(pct(latencies, 95)),
    p99: Math.round(pct(latencies, 99)),
  };
}

console.log(`Load smoke: ${base} — ${concurrency} concurrent, ${perEndpoint} req/endpoint\n`);
let failed = false;
for (const path of ENDPOINTS) {
  const r = await hammer(path);
  const errRate = r.errors / r.requests;
  if (errRate > 0.02) failed = true;
  console.log(
    `${r.path.padEnd(28)} rps=${String(r.rps).padStart(7)}  p50=${String(r.p50).padStart(5)}ms  p95=${String(r.p95).padStart(5)}ms  p99=${String(r.p99).padStart(5)}ms  errors=${r.errors}${errRate > 0.02 ? '  ⚠ FAIL (>2% errors)' : ''}`,
  );
}
console.log(failed ? '\nRESULT: FAIL' : '\nRESULT: PASS');
process.exit(failed ? 1 : 0);
