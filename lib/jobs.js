import cron from 'node-cron';
import { writeLog } from './log.js';
import { PrismaClient } from '@prisma/client';
import { runProcessingQueue } from './processing.js';

const prisma = new PrismaClient();
let started = false;

async function runProcessingJob() {
  const result = await runProcessingQueue({ batchSize: 40 });
  await writeLog({ level: 'info', message: 'jobs.processing.done', metadata: result });
}

async function checkLinksJob() {
  let count = 0;
  try {
    const packets = await prisma.memoryPacket.findMany({
      where: { 
        type: 'document', // Simplified for links/docs
        status: 'accepted'
      },
      take: 200
    });

    for (const packet of packets) {
      count += 1;
      const metadata = packet.metadata as any;
      const url = metadata?.source_url || metadata?.file_url;
      if (!url) continue;

      try {
        const res = await fetch(url, { method: 'GET' });
        await prisma.memoryPacket.update({
          where: { id: packet.id },
          data: {
            metadata: {
              ...metadata,
              link_status: res.ok ? 'active' : 'broken',
              last_checked_at: new Date().toISOString()
            }
          }
        });
      } catch (error: any) {
        await prisma.memoryPacket.update({
          where: { id: packet.id },
          data: {
            metadata: {
              ...metadata,
              link_status: 'broken',
              error_reason: error.message,
              last_checked_at: new Date().toISOString()
            }
          }
        });
      }
    }
    await writeLog({ level: 'info', message: 'jobs.links.done', metadata: { count } });
  } catch (error) {
    console.error('Job Error (checkLinks):', error);
  }
}

async function runRssSync() {
  let count = 0;
  try {
    const result = await prisma.sourceRegistry.updateMany({
      where: { type: 'rss' },
      data: {
        priority: 'low' // Simplified sync simulation
      }
    });
    count = result.count;
    await writeLog({ level: 'info', message: 'jobs.rss.done', metadata: { count } });
  } catch (error) {
    console.error('Job Error (runRssSync):', error);
  }
}

async function retryFailedSync() {
  try {
    const failed = await prisma.memoryPacket.findMany({
      where: { status: 'hold' },
      take: 200
    });
    
    // Simplified retry: log it
    await writeLog({ level: 'info', message: 'jobs.retry.done', metadata: { count: failed.length } });
  } catch (error) {
    console.error('Job Error (retryFailedSync):', error);
  }
}

export function startJobs() {
  if (started) return;
  started = true;
  cron.schedule('*/15 * * * *', () => checkLinksJob().catch(() => {}));
  cron.schedule('*/20 * * * *', () => runRssSync().catch(() => {}));
  cron.schedule('*/30 * * * *', () => retryFailedSync().catch(() => {}));
  cron.schedule('*/5 * * * *', () => runProcessingJob().catch(() => {}));
}

export async function runAllJobsOnce() {
  await checkLinksJob();
  await runRssSync();
  await retryFailedSync();
  await runProcessingJob();
  return { ok: true };
}
