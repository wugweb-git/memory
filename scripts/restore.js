import fs from 'fs/promises';
import { connectDB } from '../lib/db.js';
import { updateStore } from '../lib/store.js';

export async function runRestore(filePath) {
  if (!filePath) throw new Error('Usage: npm run restore -- <backup-file.json>');

  await connectDB();
  const raw = await fs.readFile(filePath, 'utf-8');
  const data = JSON.parse(raw);

  await updateStore((store) => {
    if (Array.isArray(data.users)) store.users = data.users;
    if (Array.isArray(data.items)) store.items = data.items;
    if (Array.isArray(data.sources)) store.sources = data.sources;
    if (Array.isArray(data.logs)) store.logs = data.logs;
    if (Array.isArray(data.metrics)) store.metrics = data.metrics;
    if (Array.isArray(data.health)) store.health = data.health;
  });

  return {
    restored: true,
    counts: {
      users: Array.isArray(data.users) ? data.users.length : 0,
      items: Array.isArray(data.items) ? data.items.length : 0,
      sources: Array.isArray(data.sources) ? data.sources.length : 0,
      logs: Array.isArray(data.logs) ? data.logs.length : 0,
      metrics: Array.isArray(data.metrics) ? data.metrics.length : 0,
      health: Array.isArray(data.health) ? data.health.length : 0
    }
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const file = process.argv[2];
  runRestore(file).then((out) => console.log(JSON.stringify(out, null, 2))).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
