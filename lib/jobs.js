import cron from 'node-cron';
import { writeLog } from './log.js';
import { updateStore } from './store.js';

let started = false;

async function checkLinksJob() {
  let count = 0;
  await updateStore(async (store) => {
    const items = store.items.filter((i) => i.content?.type === 'link' && !i.archived).slice(0, 200);
    for (const item of items) {
      count += 1;
      const url = item.source?.url || item.content?.raw;
      try {
        const res = await fetch(url, { method: 'GET' });
        item.sync.link_status = res.ok ? 'active' : 'broken';
        item.sync.error_reason = res.ok ? '' : `HTTP ${res.status}`;
      } catch (error) {
        item.sync.link_status = 'broken';
        item.sync.error_reason = error.message;
      }
      item.sync.last_checked_at = new Date().toISOString();
      item.updatedAt = new Date().toISOString();
    }
  });
  await writeLog({ action: 'jobs.links.done', response: { count } });
}

async function runRssSync() {
  let count = 0;
  await updateStore((store) => {
    const sources = store.sources.filter((s) => s.type === 'rss');
    count = sources.length;
    for (const source of sources) {
      source.last_synced_at = new Date().toISOString();
      source.status = 'synced';
      source.updatedAt = new Date().toISOString();
    }
  });
  await writeLog({ action: 'jobs.rss.done', response: { count } });
}

async function retryFailedSync() {
  let count = 0;
  await updateStore((store) => {
    const failed = store.items.filter((i) => i.sync?.link_status === 'broken' && !i.archived).slice(0, 200);
    count = failed.length;
    for (const item of failed) {
      item.sync.last_synced_at = new Date().toISOString();
      item.updatedAt = new Date().toISOString();
    }
  });
  await writeLog({ action: 'jobs.retry.done', response: { count } });
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
