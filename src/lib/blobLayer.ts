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
    const blobItem = await tx.blobItem.findUnique({
      where: { id }
    });

    if (!blobItem) {
      throw new Error('BLOB_NOT_FOUND');
    }

    let memoryPacket = await tx.memoryPacket.findFirst({
      where: { hash: blobItem.hash }
    });

    let createdMemoryPacket = false;
    if (!memoryPacket) {
      memoryPacket = await tx.memoryPacket.create({
        data: {
          type: blobItem.type || 'unknown',
          source: blobItem.source || 'unknown',
          source_id: blobItem.source_id || `blob:${blobItem.id}`,
          content: blobItem.raw_payload as any,
          metadata: {
            promoted_from_blob_id: blobItem.id,
            file_ref: blobItem.file_ref,
            blob_size: blobItem.size,
            blob_state: blobItem.state
          } as any,
          event_time: blobItem.created_at,
          hash: blobItem.hash,
          trace: {
            ...(blobItem.trace_json as any),
            promoted_at: new Date().toISOString(),
            promotion_path: 'api/blob/promote'
          } as any,
          test_run_id: blobItem.test_run_id
        } as any
      });
      createdMemoryPacket = true;
    }

    const promotedBlobItem = blobItem.state === 'promoted'
      ? blobItem
      : await tx.blobItem.update({
          where: { id },
          data: { state: 'promoted' }
        });

    await tx.blobEvent.create({
      data: {
        blob_id: id,
        event_type: 'PROMOTE',
        payload: {
          memory_packet_id: memoryPacket.id,
          created_memory_packet: createdMemoryPacket
        }
      }
    });

    return {
      ...promotedBlobItem,
      memory_packet_id: memoryPacket.id,
      created_memory_packet: createdMemoryPacket
    };
  });
}

export async function bulkBlobAction({ ids, action }: { ids: string[]; action: string }) {
  const actionMap: Record<string, string> = {
    review: 'reviewed',
    promotable: 'promotable',
    reject: 'rejected',
    promote: 'promoted'
  };

  const nextState = actionMap[action];
  if (!nextState) {
    throw new Error(`Unsupported bulk action: ${action}`);
  }

  if (ids.length === 0) {
    return 0;
  }

  return prisma.$transaction(async (tx) => {
    const candidates = await tx.blobItem.findMany({
      where: {
        id: { in: ids },
        state: { not: nextState }
      },
      select: { id: true }
    });

    const updatedIds = candidates.map((item) => item.id);
    if (updatedIds.length === 0) {
      return 0;
    }

    await tx.blobItem.updateMany({
      where: { id: { in: updatedIds } },
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
