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

async function linkStatusFor(url, contentType) {
  if (contentType !== 'link') return { status: 'active', reason: '' };
  try {
    const response = await fetch(url, { method: 'GET' });
    return response.ok ? { status: 'active', reason: '' } : { status: 'broken', reason: `HTTP ${response.status}` };
  } catch (error) {
    return { status: 'broken', reason: error.message };
  }
}

export async function syncItem(req) {
  const user = await getAuthUser(req);
  if (!user) throw fail('unauthorized', 'auth_error', 401);

  const {
    item_id,
    raw,
    url,
    external_id,
    platform,
    source_type = 'api',
    source_origin = '',
    raw_payload = null,
    profile_id = ''
  } = req.body || {};
  
  if (!raw) throw fail('raw is required', 'validation_error', 400);

  const cleanRaw = sanitizeString(raw);
  const resolvedUrl = url || (isUrl(cleanRaw) ? cleanRaw.trim() : undefined);
  const contentType = resolvedUrl ? 'link' : 'text';
  const nextHash = hashRaw(cleanRaw);

  const link = await linkStatusFor(resolvedUrl, contentType);

  // 1. Find existing packet in Postgres
  let packet = await prisma.memoryPacket.findFirst({
    where: {
      OR: [
        { id: item_id && /^[0-9a-f-]{36}$/i.test(item_id) ? item_id : undefined },
        { metadata: { path: ['external_id'], equals: sanitizeString(external_id || '') } },
        { metadata: { path: ['source_url'], equals: resolvedUrl } }
      ],
      owner_id: user.id,
      status: { not: 'rejected' }
    }
  });

  if (!packet) {
    // 2. Create new packet if not found
    packet = await prisma.memoryPacket.create({
      data: {
        type: source_type || 'api',
        content: cleanRaw,
        priority: 'medium',
        status: 'accepted',
        owner_id: user.id,
        metadata: {
          hash: nextHash,
          source_origin: source_origin || platform || 'api',
          source_url: resolvedUrl,
          external_id: sanitizeString(external_id || ''),
          link_status: link.status,
          error_reason: link.reason,
          raw_payload: raw_payload || {},
          profile_id: profile_id || user.id
        }
      }
    });

    await writeLog({ level: 'info', message: 'sync.create', user_id: user.id, metadata: { id: packet.id } });
    return { code: 201, body: packet };
  }

  // 3. Update existing packet if changed
  const currentMetadata = packet.metadata as any;
  const changed = currentMetadata.hash !== nextHash;

  const updated = await prisma.memoryPacket.update({
    where: { id: packet.id },
    data: {
      content: changed ? cleanRaw : undefined,
      metadata: {
        ...currentMetadata,
        hash: nextHash,
        link_status: link.status,
        error_reason: link.reason,
        last_synced_at: new Date().toISOString()
      }
    }
  });

  await writeLog({ level: 'info', message: 'sync.update', user_id: user.id, metadata: { id: packet.id, changed } });
  
  return { code: 200, body: updated };
}
