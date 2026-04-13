import fs from 'fs/promises';
import { connectDB } from '../lib/db.js';
import Item from '../models/Item.js';
import User from '../models/User.js';
import Source from '../models/Source.js';

export async function runRestore(filePath) {
  await connectDB();
  const raw = await fs.readFile(filePath, 'utf-8');
  const data = JSON.parse(raw);

  if (Array.isArray(data.items) && data.items.length) await Item.insertMany(data.items, { ordered: false }).catch(() => {});
  if (Array.isArray(data.users) && data.users.length) await User.insertMany(data.users, { ordered: false }).catch(() => {});
  if (Array.isArray(data.sources) && data.sources.length) await Source.insertMany(data.sources, { ordered: false }).catch(() => {});

  return { restored: true };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const file = process.argv[2];
  runRestore(file).then((out) => console.log(JSON.stringify(out, null, 2))).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
