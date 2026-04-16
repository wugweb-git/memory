import prisma from './prisma';
import crypto from 'crypto';
// Note: recursive import fixed below with a mock or internal logic if needed,
// but for this audit we ensure stability.

const SOFT_LIMIT_PCT = 70;
const WARN_LIMIT_PCT = 85;
const HARD_LIMIT_PCT = 95;
const GLOBAL_CAPACITY_BYTES = Number(process.env.GLOBAL_BLOB_CAPACITY_BYTES || 100 * 1024 * 1024);

function computeHash(content: any) {
  return crypto.createHash('sha256').update(typeof content === 'string' ? content : JSON.stringify(content)).digest('hex');
}

function sizeOf(content: any) {
  return Buffer.byteLength(typeof content === 'string' ? content : JSON.stringify(content), 'utf8');
}

export async function Push_To_Blob(packet: any) {
  const { type, source, source_id, raw_payload, file_ref, trace_json } = packet;
  const contentSize = sizeOf(raw_payload);
  const hash = computeHash(raw_payload);

  const stats = await getBlobStats();
  if (stats.usage_percent >= HARD_LIMIT_PCT) {
    throw new Error('BLOB_STORAGE_FULL: Hard limit reached (95%). Ingestion blocked.');
  }

  const item = await prisma.blobItem.create({
    data: {
      type: type || 'unknown',
      source: source || 'unknown',
      source_id: source_id || null,
      raw_payload: raw_payload || {},
      file_ref: file_ref || null,
      size: contentSize,
      hash: hash,
      state: 'raw',
      trace_json: trace_json || { origin: source, ingestion_path: 'api/blob/push' }
    }
  });

  await prisma.blobEvent.create({
    data: {
      blob_id: item.id,
      event_type: 'PUSH',
      payload: { size: contentSize, hash }
    }
  });

  return item;
}

export async function getBlobStats() {
  const aggregate = await prisma.blobItem.aggregate({
    _sum: { size: true },
    _count: { id: true }
  });

  const used = aggregate._sum.size || 0;
  const count = aggregate._count.id || 0;
  const usagePercent = Math.round((used / GLOBAL_CAPACITY_BYTES) * 100);

  let status: 'healthy' | 'warning' | 'critical' | 'blocked' = 'healthy';
  if (usagePercent >= 95) status = 'blocked';
  else if (usagePercent >= 85) status = 'critical';
  else if (usagePercent >= 70) status = 'warning';

  return {
    used_bytes: used,
    total_bytes: GLOBAL_CAPACITY_BYTES,
    usage_percent: usagePercent,
    item_count: count,
    status
  };
}

export async function cleanupExpiredBlobItems() {
  const now = new Date();
  const result = await prisma.blobItem.updateMany({
    where: {
      expires_at: { lte: now },
      state: { not: 'promoted' }
    },
    data: { state: 'expired' }
  });

  return result.count;
}
