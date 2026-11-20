import prisma from './prisma';
import crypto from 'crypto';
import { stripNullBytes } from './memory/sanitize';
// Note: recursive import fixed below with a mock or internal logic if needed,
// but for this audit we ensure stability.

const SOFT_LIMIT_PCT = 70;
const WARN_LIMIT_PCT = 85;
const HARD_LIMIT_PCT = 95;
/** Unreviewed buffer items expire after this long (then are flagged `expired`, then purged). */
export const BLOB_TTL_DAYS = 90;
/** Promoted/rejected items have served their purpose: purge after this many days. */
export const BLOB_DONE_RETENTION_DAYS = 30;
/** Expired items are kept briefly (a grace window) before being purged. */
export const BLOB_EXPIRED_GRACE_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;
const GLOBAL_CAPACITY_BYTES = Number(process.env.GLOBAL_BLOB_CAPACITY_BYTES || 100 * 1024 * 1024);

function computeHash(content: any) {
  return crypto.createHash('sha256').update(typeof content === 'string' ? content : JSON.stringify(content)).digest('hex');
}

function sizeOf(content: any) {
  return Buffer.byteLength(typeof content === 'string' ? content : JSON.stringify(content), 'utf8');
}

export async function Push_To_Blob(packet: any) {
  // Strip NUL / control chars up-front — Postgres jsonb rejects them (22P05).
  const { type, source, source_id, raw_payload, file_ref, trace_json } = stripNullBytes(packet);
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
      expires_at: new Date(Date.now() + BLOB_TTL_DAYS * DAY_MS),
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

export async function getBlobStats(db: Pick<typeof prisma, 'blobItem'> = prisma) {
  // Expired rows are on their way out and no longer count against capacity.
  const aggregate = await db.blobItem.aggregate({
    where: { state: { not: 'expired' } },
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
      // Already-expired rows are skipped so their updated_at (the purge clock) is not refreshed.
      state: { notIn: ['promoted', 'expired'] }
    },
    data: { state: 'expired' }
  });

  return result.count;
}

/**
 * Deletes buffer rows that are done: promoted/rejected older than 30 days and
 * `expired` older than the grace window. Events cascade. Returns what was purged.
 */
export async function purgeBlobItems(db: Pick<typeof prisma, 'blobItem'> = prisma, now: Date = new Date()) {
  const doneBefore = new Date(now.getTime() - BLOB_DONE_RETENTION_DAYS * DAY_MS);
  const expiredBefore = new Date(now.getTime() - BLOB_EXPIRED_GRACE_DAYS * DAY_MS);
  const result = await db.blobItem.deleteMany({
    where: {
      OR: [
        { state: { in: ['promoted', 'rejected'] }, updated_at: { lt: doneBefore } },
        { state: 'expired', updated_at: { lt: expiredBefore } },
      ],
    },
  });
  return result.count;
}

export async function Mark_Reviewed(id: string) {
  const item = await prisma.blobItem.update({
    where: { id },
    data: { state: 'reviewed' }
  });

  await prisma.blobEvent.create({
    data: {
      blob_id: id,
      event_type: 'MARK_REVIEWED',
      payload: {}
    }
  });

  return item;
}

export async function Mark_Promotable(id: string) {
  const item = await prisma.blobItem.update({
    where: { id },
    data: { state: 'promotable' }
  });

  await prisma.blobEvent.create({
    data: {
      blob_id: id,
      event_type: 'MARK_PROMOTABLE',
      payload: {}
    }
  });

  return item;
}

export async function Reject_Blob_Item(id: string, reason?: string) {
  const item = await prisma.blobItem.update({
    where: { id },
    data: { state: 'rejected' }
  });

  await prisma.blobEvent.create({
    data: {
      blob_id: id,
      event_type: 'REJECT',
      payload: { reason: reason || 'unspecified' }
    }
  });

  return item;
}

/**
 * Promote a blob item into L1 memory. Goes through MemoryService.ingest so promoted items get the
 * same governance as every other source: gate, normalization, dedup, noise filter and the
 * sensitivity/encryption path. (Previously this wrote memoryPacket rows directly and skipped all of it.)
 */
export async function Promote_To_Memory(id: string) {
  const blob = await prisma.blobItem.findUnique({ where: { id } });
  if (!blob) throw new Error(`Blob item not found: ${id}`);

  const payload: any = stripNullBytes(blob.raw_payload || {});
  const isObj = payload && typeof payload === 'object' && !Array.isArray(payload);
  const trace: any = (blob.trace_json as any) || {};
  const origin = trace.origin || blob.source || 'unknown';
  const pathStep = typeof trace.ingestion_path === 'string' ? trace.ingestion_path : 'blob/promote';

  const { MemoryService } = await import('./memory/service');
  const { IDENTITY_CONFIG } = await import('../config/identity');

  const raw = {
    source: blob.source || 'unknown',
    source_id: blob.source_id || blob.id,
    type: blob.type || 'external',
    event_time: blob.created_at.toISOString(),
    content: isObj ? (payload.body ?? payload.content ?? payload.text ?? payload) : payload,
    // Surface structured fields (subject/from/...) as metadata, minus the body we promoted as content.
    metadata: {
      ...(isObj ? Object.fromEntries(Object.entries(payload).filter(([k]) => !['body', 'content', 'text'].includes(k))) : {}),
      promoted_from_blob_id: blob.id,
      blob_hash: blob.hash,
      promotion_path: 'api/blob/promote',
    },
    sensitivity: isObj && payload.sensitivity === 'restricted' ? 'restricted' : undefined,
    // normalize() spreads trace.ingestion_path, so it must be an array (blobs store a string).
    trace: { origin, ingestion_path: [pathStep], parent_origin_id: trace.parent_origin_id || null },
  };

  const result = await MemoryService.ingest(raw, IDENTITY_CONFIG.DEFAULT_USER_ID);

  if (result.status === 'FAILED') {
    // Transient/internal failure: leave the blob as-is so promotion can be retried.
    throw new Error(`Promote failed for blob ${id}: ${result.reason}`);
  }

  const accepted = result.status === 'ACCEPTED' || (result.status === 'IGNORE' && result.packet_id);
  const nextState = accepted ? 'promoted' : result.status === 'HOLD' ? blob.state : 'rejected';
  const packetId: string | null = accepted ? result.packet_id : null;

  if (packetId && blob.test_run_id && blob.test_run_id !== 'PROD') {
    await prisma.memoryPacket.update({ where: { id: packetId }, data: { test_run_id: blob.test_run_id } });
  }

  const item = await prisma.$transaction(async (tx) => {
    const updated = nextState === blob.state ? blob : await tx.blobItem.update({ where: { id }, data: { state: nextState } });
    await tx.blobEvent.create({
      data: {
        blob_id: id,
        event_type: accepted ? 'PROMOTE' : 'PROMOTE_BLOCKED',
        payload: { memory_packet_id: packetId, ingest_status: result.status, reason: result.reason ?? null },
      },
    });
    return updated;
  });

  return { ...item, memory_packet_id: packetId, ingest_status: result.status as string };
}

export async function bulkBlobAction({ ids, action }: { ids: string[]; action: string }) {
  if (action === 'promote') {
    let promotedCount = 0;
    for (const id of ids) {
      await Promote_To_Memory(id);
      promotedCount += 1;
    }
    return promotedCount;
  }

  const actionMap: Record<string, string> = {
    review: 'reviewed',
    promotable: 'promotable',
    reject: 'rejected'
  };

  const nextState = actionMap[action];
  if (!nextState) {
    throw new Error(`Unsupported bulk action: ${action}`);
  }

  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length === 0) {
    return 0;
  }

  return prisma.$transaction(async (tx) => {
    const itemsToUpdate = await tx.blobItem.findMany({
      where: {
        id: { in: uniqueIds },
        state: { not: nextState }
      },
      select: { id: true }
    });

    const updatedIds = itemsToUpdate.map((item) => item.id);

    if (updatedIds.length === 0) {
      return 0;
    }

    await tx.blobItem.updateMany({
      where: {
        id: { in: updatedIds }
      },
      data: { state: nextState }
    });

    await tx.blobEvent.createMany({
      data: updatedIds.map((blobId) => ({
        blob_id: blobId,
        event_type: `BULK_${action.toUpperCase()}`,
        payload: {}
      }))
    });

    return updatedIds.length;
  });
}
