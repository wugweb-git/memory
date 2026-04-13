import cron from 'node-cron';
import { connectDB } from './db.js';
import { writeLog } from './log.js';
import { withRetry } from './errors.js';
import Item from '../models/Item.js';
import Source from '../models/Source.js';

let started = false;

async function checkLinksJob() {
  await connectDB();
  const items = await Item.find({ 'content.type': 'link', archived: { $ne: true } }).limit(200);
  for (const item of items) {
    const url = item.source?.url || item.content?.raw;
    const result = await withRetry(async () => {
      const res = await fetch(url, { method: 'GET' });
      return res.ok ? { status: 'active', reason: '' } : { status: 'broken', reason: `HTTP ${res.status}` };
    }, 2, 250).catch((e) => ({ status: 'broken', reason: e.message }));

    item.sync.link_status = result.status;
    item.sync.error_reason = result.reason;
    item.sync.last_checked_at = new Date();
    await item.save();
  }
  await writeLog({ action: 'jobs.links.done', response: { count: items.length } });
}

async function runRssSync() {
  await connectDB();
  const sources = await Source.find({ type: 'rss' });
  for (const source of sources) {
    source.last_synced_at = new Date();
    source.status = 'synced';
    await source.save();
  }
  await writeLog({ action: 'jobs.rss.done', response: { count: sources.length } });
}

async function retryFailedSync() {
  await connectDB();
  const failed = await Item.find({ 'sync.link_status': 'broken', archived: { $ne: true } }).limit(200);
  for (const item of failed) {
    item.sync.last_synced_at = new Date();
    await item.save();
  }
  await writeLog({ action: 'jobs.retry.done', response: { count: failed.length } });
}

export function startJobs() {
  if (started) return;
  started = true;
  cron.schedule('*/15 * * * *', () => checkLinksJob().catch(() => {}));
  cron.schedule('*/20 * * * *', () => runRssSync().catch(() => {}));
  cron.schedule('*/30 * * * *', () => retryFailedSync().catch(() => {}));
}

export async function runAllJobsOnce() {
  await checkLinksJob();
  await runRssSync();
  await retryFailedSync();
  return { ok: true };
}
