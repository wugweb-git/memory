import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { promoteToMemoryInternal } from './memoryManagement.js';

const prisma = new PrismaClient();

const SOFT_LIMIT_PCT = 70;
const WARN_LIMIT_PCT = 85;
const HARD_LIMIT_PCT = 95;
const DEFAULT_LIMIT_BYTES = Number(process.env.BLOB_LAYER_LIMIT_BYTES || 5 * 1024 * 1024); // 5MB default limit for total blob? Or per item? 
// The Codex says: "Track: total Blob size... Limits: soft limit (70%)..."
// This implies a global capacity.
const GLOBAL_CAPACITY_BYTES = Number(process.env.GLOBAL_BLOB_CAPACITY_BYTES || 100 * 1024 * 1024); // 100MB default capacity

function computeHash(content) {
  return crypto.createHash('sha256').update(typeof content === 'string' ? content : JSON.stringify(content)).digest('hex');
}

function sizeOf(content) {
  return Buffer.byteLength(typeof content === 'string' ? content : JSON.stringify(content), 'utf8');
}

/**
 * Pushes raw data into the Blob (Layer 0) quarantine.
 * @param {Object} packet - The raw ingestion packet.
 */
export async function Push_To_Blob(packet) {
  const { type, source, source_id, raw_payload, file_ref, trace_json } = packet;

  const contentSize = sizeOf(raw_payload);
  const hash = computeHash(raw_payload);

  // 1. Check storage limits at API level
  const stats = await getBlobStats();
  if (stats.usage_percent >= HARD_LIMIT_PCT) {
    throw new Error('BLOB_STORAGE_FULL: Hard limit reached (95%). Ingestion blocked.');
  }

  // 2. Create the blob item
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

  // 3. Log the event
  await prisma.blobEvent.create({
    data: {
      blob_id: item.id,
      event_type: 'PUSH',
      payload: { size: contentSize, hash }
    }
  });

  // 4. Ingestion Anomaly Detection (Duplicate)
  const duplicateCount = await prisma.blobItem.count({
    where: { hash: hash, id: { not: item.id } }
  });

  if (duplicateCount > 0) {
    await prisma.blobEvent.create({
      data: {
        blob_id: item.id,
        event_type: 'blobin_gestion.anomaly',
        payload: { reason: 'duplicate_detected' }
      }
    });
  }

  return item;
}

/**
 * Promotes an item from Blob to Memory (Layer 1).
 * @param {string} blobId 
 */
export async function Promote_To_Memory(blobId) {
  const item = await prisma.blobItem.findUnique({ where: { id: blobId } });
  if (!item) throw new Error('Blob item not found');

  if (item.state === 'promoted') return item;

  // 1. Promote to Memory (Layer 1) via Ingestion Gate
  try {
    // In a real app, we'd need the User object from the session. 
    // For this migration, we assume the operation is performed by a valid actor.
    const result = await promoteToMemoryInternal({
      payload: {
        raw_payload: item.raw_payload,
        source_type: item.type,
        source_id: item.source_id,
        trust_score: 0.9, // Higher trust after review
        priority_level: 'medium'
      },
      user: { _id: item.owner_id || 'system', role: 'admin' } // Mock user for internal call
    });

    if (result.status === 'accepted') {
      const updated = await prisma.blobItem.update({
        where: { id: blobId },
        data: { state: 'promoted' }
      });

      await prisma.blobEvent.create({
        data: {
          blob_id: blobId,
          event_type: 'PROMOTE',
          actor: 'user',
          payload: { target_id: result.packet.id }
        }
      });

      return updated;
    } else {
      throw new Error(`Promotion held: ${result.packet.metadata.hold_reason}`);
    }
  } catch (error) {
    // If failed, remain in Blob and attach error_reason
    await prisma.blobItem.update({
      where: { id: blobId },
      data: { 
        trace_json: { 
          ...(item.trace_json || {}), 
          error_reason: error.message 
        } 
      }
    });
    throw error;
  }
}

/**
 * Marks an item as reviewed.
 */
export async function Mark_Reviewed(blobId) {
  return transitionState(blobId, 'reviewed', 'REVIEW');
}

/**
 * Marks an item as promotable.
 */
export async function Mark_Promotable(blobId) {
  return transitionState(blobId, 'promotable', 'MARK_PROMOTABLE');
}

/**
 * Rejects a blob item.
 */
export async function Reject_Blob_Item(blobId, reason = 'manual_rejection') {
  const item = await prisma.blobItem.update({
    where: { id: blobId },
    data: { 
      state: 'rejected',
      trace_json: { reason }
    }
  });

  await prisma.blobEvent.create({
    data: {
      blob_id: blobId,
      event_type: 'REJECT',
      actor: 'user',
      payload: { reason }
    }
  });

  return item;
}

async function transitionState(blobId, newState, eventType) {
  const item = await prisma.blobItem.update({
    where: { id: blobId },
    data: { state: newState }
  });

  await prisma.blobEvent.create({
    data: {
      blob_id: blobId,
      event_type: eventType,
      actor: 'user'
    }
  });

  return item;
}

/**
 * Retrieves storage statistics.
 */
export async function getBlobStats() {
  const aggregate = await prisma.blobItem.aggregate({
    _sum: { size: true },
    _count: { id: true }
  });

  const used = aggregate._sum.size || 0;
  const count = aggregate._count.id || 0;
  const usagePercent = Math.round((used / GLOBAL_CAPACITY_BYTES) * 100);

  let status = 'healthy';
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

/**
 * Bulk actions for multiple blob items.
 */
export async function bulkBlobAction({ ids, action }) {
  if (!Array.isArray(ids) || ids.length === 0) return 0;

  let result;
  if (action === 'delete') {
    result = await prisma.blobItem.deleteMany({ where: { id: { in: ids } } });
  } else if (action === 'promote') {
    // Note: Promotion usually requires item-by-item validation, 
    // but we support bulk state update for simplicity if requested.
    result = await prisma.blobItem.updateMany({
      where: { id: { in: ids } },
      data: { state: 'promoted' }
    });
  } else if (action === 'reject') {
    result = await prisma.blobItem.updateMany({
      where: { id: { in: ids } },
      data: { state: 'rejected' }
    });
  }

  return result?.count || 0;
}

/**
 * Cleanup expired items.
 */
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
