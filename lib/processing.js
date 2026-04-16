import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const PROCESSING_VERSION = 'layer2-v3-postgres';

/**
 * IDENTITY PRISM: UNIFIED PROCESSING GATE (POSTGRES)
 */

export async function enqueuePacketForProcessing(packetId, options = {}) {
  // In the new architecture, we'll use a simple "status" flag or a dedicated job table.
  // For now, we update the MemoryPacket status to 'accepted' which implies it's ready.
  // If we had a Job table, we'd insert there.
  return { status: 'queued', packetId };
}

export async function runProcessingQueue({ batchSize = 25 } = {}) {
  const result = { processed: 0, failed: 0, skipped: 0, jobs_total: 0 };
  
  try {
    // 1. Fetch 'accepted' packets that haven't been processed yet
    const packets = await prisma.memoryPacket.findMany({
      where: { 
        status: 'accepted',
        metadata: { path: ['processing_version'], not: PROCESSING_VERSION }
      },
      take: batchSize
    });

    result.jobs_total = packets.length;

    for (const packet of packets) {
      try {
        await processSinglePacket(packet);
        result.processed += 1;
      } catch (err) {
        console.error(`Failed to process packet ${packet.id}:`, err);
        result.failed += 1;
      }
    }
  } catch (error) {
    console.error('Queue Processing Error:', error);
  }

  return result;
}

async function processSinglePacket(packet) {
  const raw = String(packet.content || '').trim();
  if (!raw) return;

  // 1. Simple Enrichment (Simulated AI / NLP)
  const intent = extractIntent(raw);
  const domains = detectDomains(raw);

  // 2. Update Packet Metadata in Postgres
  await prisma.memoryPacket.update({
    where: { id: packet.id },
    data: {
      metadata: {
        ...(packet.metadata),
        processing_version: PROCESSING_VERSION,
        intent,
        primary_domain: domains.primary_domain,
        processed_at: new Date().toISOString()
      }
    }
  });

  // 3. Log to Activity Stream
  await prisma.activityStream.create({
    data: {
      event: 'PACKET_PROCESSED',
      target: packet.id
    }
  });
}

// Helpers retained from legacy with minor cleanup
const INTENTS = [
  { name: 'build', terms: ['build', 'implement', 'ship', 'create', 'develop'] },
  { name: 'learn', terms: ['learn', 'study', 'understand', 'research'] },
  { name: 'publish', terms: ['publish', 'release', 'announce', 'share'] }
];

function extractIntent(text = '') {
  const lower = text.toLowerCase();
  for (const intent of INTENTS) {
    if (intent.terms.some((term) => lower.includes(term))) return intent.name;
  }
  return 'explore';
}

function detectDomains(text = '') {
  const lower = text.toLowerCase();
  if (lower.includes('ai') || lower.includes('model')) return { primary_domain: 'ai' };
  if (lower.includes('ux') || lower.includes('design')) return { primary_domain: 'ux' };
  return { primary_domain: 'general' };
}
