import { PrismaClient } from '@prisma/client';
import { hashRaw } from '../lib/hash.js';

const prisma = new PrismaClient();

function asJson(body) {
  if (!body) return {};
  if (typeof body === 'string') {
    try { return JSON.parse(body); } catch { return {}; }
  }
  return body;
}

function isUrl(raw) {
  return typeof raw === 'string' && /^https?:\/\//i.test(raw.trim());
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const items = await prisma.memoryPacket.findMany({
        where: { status: 'accepted' },
        orderBy: { created_at: 'desc' },
        take: 50
      });
      return res.status(200).json(items);
    }

    if (req.method === 'POST') {
      const { raw } = asJson(req.body);
      if (!raw) return res.status(400).json({ error: 'raw is required' });

      const type = isUrl(raw) ? 'link' : 'text';
      const cleanRaw = String(raw).trim();
      const hash = hashRaw(cleanRaw);

      // Deduplication
      const existing = await prisma.memoryPacket.findFirst({
        where: { 
          content: cleanRaw,
          status: { not: 'rejected' }
        }
      });

      if (existing) {
        return res.status(200).json({ status: 'exists', item: existing });
      }

      const item = await prisma.memoryPacket.create({
        data: {
          type: type,
          content: cleanRaw,
          priority: 'medium',
          status: 'accepted',
          metadata: { hash, source_origin: 'legacy_api' }
        }
      });

      return res.status(201).json({ status: 'saved', item });
    }

    if (req.method === 'DELETE') {
      const { item_id } = asJson(req.body);
      if (!item_id) return res.status(400).json({ error: 'item_id is required' });

      await prisma.memoryPacket.update({
        where: { id: item_id },
        data: { status: 'rejected' }
      });

      return res.status(200).json({ status: 'deleted', item_id });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Legacy API Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
