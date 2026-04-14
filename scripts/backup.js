import fs from 'fs/promises';
import path from 'path';
import { connectDB } from '../lib/db.js';
import { readStore } from '../lib/store.js';

export async function runBackup() {
  await connectDB();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = path.join(process.cwd(), 'backups');
  await fs.mkdir(dir, { recursive: true });

  const state = await readStore();
  const data = {
    generated_at: new Date().toISOString(),
    users: state.users,
    items: state.items,
    sources: state.sources,
    logs: state.logs,
    metrics: state.metrics,
    health: state.health
  };

  const file = path.join(dir, `backup-${stamp}.json`);
  await fs.writeFile(file, JSON.stringify(data, null, 2));
  return {
    file,
    counts: {
      users: data.users.length,
      items: data.items.length,
      sources: data.sources.length,
      logs: data.logs.length,
      metrics: data.metrics.length,
      health: data.health.length
    }
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runBackup().then((out) => console.log(JSON.stringify(out, null, 2))).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
