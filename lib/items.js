import { getAuthUser } from './auth.js';
import { fail } from './errors.js';
import { hashRaw } from './hash.js';
import { writeLog } from './log.js';
import { sanitizeString } from '../middleware/requestGuards.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function isUrl(raw) {
  return typeof raw === 'string' && /^https?:\/\//i.test(raw.trim());
}

async function linkStatusFor(raw, type) {
  if (type !== 'link') return { status: 'active', reason: '' };
  try {
    const response = await fetch(raw, { method: 'GET' });
    return response.ok ? { status: 'active', reason: '' } : { status: 'broken', reason: `HTTP ${response.status}` };
  } catch (error) {
    return { status: 'broken', reason: error.message };
  }
}

export async function getItems(req) {
  const user = await getAuthUser(req);
  if (!user) throw fail('unauthorized', 'auth_error', 401);

  const page = Math.max(parseInt(req.query?.page || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query?.limit || '20', 10), 1), 50);
  const q = sanitizeString(req.query?.q || '').toLowerCase();
  const type = sanitizeString(req.query?.type || '');
  const scope = req.query?.scope || 'mine';

  const where: any = {
    status: { not: 'rejected' }
  };

  if (scope === 'public') {
    where.metadata = { path: ['visibility'], equals: 'public' };
  } else if (!(scope === 'all' && user.role === 'admin')) {
    where.owner_id = user.id;
  }

  if (q) {
    where.content = { contains: q, mode: 'insensitive' };
  }
  if (type) {
    where.type = type;
  }

  const [items, total] = await Promise.all([
    prisma.memoryPacket.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.memoryPacket.count({ where })
  ]);

  return { items, total, page, limit, has_more: page * limit < total };
}

export async function createItem(req) {
  const user = await getAuthUser(req);
  if (!user) throw fail('unauthorized', 'auth_error', 401);

  const {
    raw,
    visibility = 'private',
    source_type = 'manual',
    source_origin = 'manual',
    raw_payload = null,
    profile_id = ''
  } = req.body || {};
  
  if (!raw) throw fail('raw is required', 'validation_error', 400);

  const cleanedRaw = sanitizeString(raw);
  const hashed = hashRaw(cleanedRaw);

  // Deduplication check
  const existing = await prisma.memoryPacket.findFirst({
    where: {
      owner_id: user.id,
      metadata: { path: ['hash'], equals: hashed },
      status: { not: 'rejected' }
    }
  });

  if (existing) {
    return { code: 200, body: { status: 'exists', item: existing } };
  }

  const type = isUrl(cleanedRaw) ? 'link' : 'text';
  const link = await linkStatusFor(cleanedRaw, type);

  const item = await prisma.memoryPacket.create({
    data: {
      type: source_type || 'manual',
      content: cleanedRaw,
      priority: 'medium',
      status: 'accepted',
      owner_id: user.id,
      metadata: {
        hash: hashed,
        visibility,
        source_origin,
        link_status: link.status,
        error_reason: link.reason,
        raw_payload: raw_payload || {},
        profile_id: profile_id || user.id
      }
    }
  });

  await writeLog({ level: 'info', message: 'items.create', user_id: user.id, metadata: { id: item.id } });
  
  return { code: 201, body: { status: 'saved', item } };
}

export async function deleteItem(req) {
  const user = await getAuthUser(req);
  if (!user) throw fail('unauthorized', 'auth_error', 401);
  const { item_id } = req.body || {};
  if (!item_id) throw fail('item_id is required', 'validation_error', 400);

  const item = await prisma.memoryPacket.findUnique({ where: { id: item_id } });
  if (!item) throw fail('item not found', 'validation_error', 404);
  
  if (user.role !== 'admin' && item.owner_id !== user.id) {
    throw fail('forbidden', 'auth_error', 403);
  }

  await prisma.memoryPacket.update({
    where: { id: item_id },
    data: { status: 'rejected' } // Using 'rejected' as soft-delete/archive
  });

  await writeLog({ level: 'info', message: 'items.archive', user_id: user.id, metadata: { item_id } });
  
  return { code: 200, body: { status: 'deleted', item_id } };
}
