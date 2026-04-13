import fs from 'fs/promises';
import path from 'path';
import { connectDB } from '../lib/db.js';
import Item from '../models/Item.js';
import User from '../models/User.js';
import Source from '../models/Source.js';
import Log from '../models/Log.js';

export async function runBackup() {
  await connectDB();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = path.join(process.cwd(), 'backups');
  await fs.mkdir(dir, { recursive: true });

  const data = {
    generated_at: new Date().toISOString(),
    items: await Item.find().lean(),
    users: await User.find().lean(),
    sources: await Source.find().lean(),
    logs: await Log.find().lean()
  };

  const file = path.join(dir, `backup-${stamp}.json`);
  await fs.writeFile(file, JSON.stringify(data));
  return { file, counts: { items: data.items.length, users: data.users.length, sources: data.sources.length, logs: data.logs.length } };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runBackup().then((out) => console.log(JSON.stringify(out, null, 2))).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
