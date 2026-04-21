const base = process.env.BASE_URL || 'http://localhost:3000';

async function run() {
  const started = Date.now();
  const reqs = [];
  for (let i = 0; i < 1000; i += 1) {
    reqs.push(fetch(`${base}/api/items?page=1&limit=20`, { headers: { Authorization: `Bearer ${process.env.ACCESS_TOKEN || ''}` } }).catch(() => null));
  }
  await Promise.all(reqs);
  const elapsed = Date.now() - started;
  console.log(JSON.stringify({ requests: 1000, elapsed_ms: elapsed, avg_ms: elapsed / 1000 }, null, 2));
}

run();
