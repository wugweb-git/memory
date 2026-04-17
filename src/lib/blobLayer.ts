import prisma from './prisma';
import crypto from 'crypto';
import type { Prisma } from '@prisma/client';
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

async function upsertMemoryPacketFromBlob(
  tx: Prisma.TransactionClient,
  item: {
    id: string;
    type: string;
    source: string;
    source_id: string | null;
    raw_payload: any;
    hash: string;
    trace_json: any;
    created_at: Date;
    test_run_id: string;
  }
) {
  const promotedSourceId = item.source_id || item.id;

  const existing = await tx.memoryPacket.findFirst({
    where: {
      hash: item.hash,
      source: item.source || 'unknown',
      source_id: promotedSourceId
    },
    select: { id: true }
  });

  if (existing) {
    return existing;
  }

  return tx.memoryPacket.create({
    data: {
      type: item.type || 'unknown',
      source: item.source || 'unknown',
      source_id: promotedSourceId,
      content: item.raw_payload || {},
      metadata: {
        promoted_from_blob_id: item.id,
        blob_hash: item.hash,
        promotion_path: 'api/blob/promote'
      },
      event_time: item.created_at,
      hash: item.hash,
      trace: item.trace_json || {
        origin: item.source || 'unknown',
        ingestion_path: 'blob/promote'
      },
      test_run_id: item.test_run_id || 'PROD'
    }
  });
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

export async function Promote_To_Memory(id: string) {
  return prisma.$transaction(async (tx) => {
    const existingItem = await tx.blobItem.findUnique({
      where: { id },
      select: {
        id: true,
        type: true,
        source: true,
        source_id: true,
        raw_payload: true,
        hash: true,
        trace_json: true,
        created_at: true,
        test_run_id: true
      }
    });

    if (!existingItem) {
      throw new Error(`Blob item not found: ${id}`);
    }

    const memoryPacket = await upsertMemoryPacketFromBlob(tx, existingItem);

    const item = await tx.blobItem.update({
      where: { id },
      data: { state: 'promoted' }
    });

    await tx.blobEvent.create({
      data: {
        blob_id: id,
        event_type: 'PROMOTE',
        payload: { memory_packet_id: memoryPacket.id }
      }
    });

    return item;
  });
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

  const idsToUpdate = await prisma.blobItem.findMany({
    where: {
      id: { in: ids },
      NOT: { state: nextState }
    },
    select: { id: true }
  });

  const result = await prisma.blobItem.updateMany({
    where: {
      id: { in: idsToUpdate.map((item) => item.id) }
    },
    data: { state: nextState }
  });

  if (idsToUpdate.length > 0) {
    await prisma.blobEvent.createMany({
      data: idsToUpdate.map(({ id }) => ({
        blob_id: id,
        event_type: `BULK_${action.toUpperCase()}`,
        payload: {}
      }))
    });
  }

  return result.count;
}
