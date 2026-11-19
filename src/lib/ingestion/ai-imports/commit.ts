import { randomUUID } from 'node:crypto';
import { conversationToPackets, importSourceTag, sanitizeConversations, type PacketDraft } from './packets';
import type { NormalizedConversation, SkipCounts } from './types';

/**
 * Server side of the AI-history import. The browser parses the export and sends
 * normalised conversations in small chunks; this file turns one chunk into
 * memory packets. It never calls the embedder: packets land pending at priority
 * "low", and the existing pipeline embeds them after fresher notes (the worker
 * orders by priority) and under its own back-off.
 */

export const DEFAULT_MAX_PACKETS = 2000;
/** Hard ceiling for one request regardless of the import cap. */
export const MAX_PACKETS_PER_CHUNK = 1500;

export const maxPacketsPerImport = (env: NodeJS.ProcessEnv = process.env): number => {
  const n = Number(env.AI_IMPORT_MAX_PACKETS);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_MAX_PACKETS;
};

/** The slice of Prisma this file uses (injectable for tests). */
export interface ImportDb {
  memoryPacket: {
    findMany(args: any): Promise<Array<{ hash: string }>>;
    count(args: any): Promise<number>;
    createMany(args: any): Promise<{ count: number }>;
  };
  provenanceRecord: { createMany(args: any): Promise<{ count: number }> };
}

export interface ChunkReport {
  mode: 'dry-run' | 'commit';
  conversations: number;
  messages: number;
  /** Packets the chunk produces after windowing. */
  packets: number;
  duplicates: number;
  /** New packets (dry-run: would be created; commit: created). */
  created: number;
  /** New packets left out because the per-import cap was reached. */
  overCap: number;
  skipped: SkipCounts & { conversationsWithoutText: number };
  cap: number;
  /** Packets already stored under this importId plus this chunk's created. */
  importTotal: number;
  message?: string;
}

const importIdOk = (s: string) => /^[A-Za-z0-9_-]{8,64}$/.test(s);

export async function processChunk(
  params: { mode: 'dry-run' | 'commit'; importId: string; userId: string; conversations: unknown; now?: Date; env?: NodeJS.ProcessEnv },
  db: ImportDb,
): Promise<ChunkReport> {
  if (!importIdOk(params.importId)) throw new Error('importId must be 8 to 64 letters, digits, dashes or underscores.');
  const sent = Array.isArray(params.conversations) ? params.conversations.length : 0;
  const conversations = sanitizeConversations(params.conversations);
  const cap = maxPacketsPerImport(params.env);
  const now = params.now ?? new Date();

  const drafts: PacketDraft[] = [];
  const seen = new Set<string>();
  const skipped = { attachments: 0, nonConversation: 0, empty: 0, conversationsWithoutText: Math.max(0, sent - conversations.length) };
  let messages = 0;
  for (const c of conversations as NormalizedConversation[]) {
    messages += c.messages.length;
    skipped.attachments += c.skipped.attachments;
    skipped.nonConversation += c.skipped.nonConversation;
    skipped.empty += c.skipped.empty;
    for (const d of conversationToPackets(c, { importId: params.importId, fallbackTime: now })) {
      if (seen.has(d.hash)) continue; // the same text twice in one chunk
      seen.add(d.hash);
      drafts.push(d);
    }
  }
  if (drafts.length > MAX_PACKETS_PER_CHUNK) throw new Error(`This request makes ${drafts.length} packets; send at most ${MAX_PACKETS_PER_CHUNK} per request.`);

  const existing = drafts.length
    ? new Set((await db.memoryPacket.findMany({ where: { hash: { in: drafts.map((d) => d.hash) } }, select: { hash: true } })).map((r) => r.hash))
    : new Set<string>();
  const fresh = drafts.filter((d) => !existing.has(d.hash));
  const already = await db.memoryPacket.count({ where: { metadata: { path: ['import_id'], equals: params.importId } } });
  const room = Math.max(0, cap - already);
  const toWrite = fresh.slice(0, room);
  const overCap = fresh.length - toWrite.length;

  const report: ChunkReport = {
    mode: params.mode,
    conversations: conversations.length,
    messages,
    packets: drafts.length,
    duplicates: drafts.length - fresh.length,
    created: toWrite.length,
    overCap,
    skipped,
    cap,
    importTotal: already + toWrite.length,
  };
  if (overCap > 0) {
    report.message = `Import limit reached: at most ${cap} packets per import so the embedder is not flooded. ${overCap} packets from this chunk were not ${params.mode === 'commit' ? 'imported' : 'counted as importable'}. Import the rest later or in a second run (already imported text is skipped).`;
  }

  if (params.mode === 'commit' && toWrite.length) {
    const rows = toWrite.map((d) => ({ ...d, id: randomUUID() }));
    await db.memoryPacket.createMany({
      data: rows.map((d) => ({
        id: d.id,
        type: d.type,
        source: d.source,
        source_id: d.source_id,
        content: d.content,
        metadata: d.metadata as any,
        event_time: d.event_time,
        ownership: 'self',
        sensitivity: 'normal', // 'restricted' would skip embedding; privacy comes from is_public false
        priority: 'low', // the embedder and L2 order by priority, so fresh notes go first
        confidence: 1,
        status: 'active',
        hash: d.hash,
        trace: { origin: d.source, ingestion_path: ['import/ai-chats'], parent_origin_id: null, attempt_count: 0, import_id: params.importId } as any,
        embedding_status: 'pending',
        processing_status: 'pending',
        semantic_status: 'pending',
        max_retries: 2,
        is_embeddable: d.content.length >= 50,
        is_public: false,
        schema_version: 2,
      })),
    });
    // Provenance ledger: one entry per packet. The ledger's score is "AI likelihood", and for imported
    // chats that is the share of characters the assistant wrote, with low confidence.
    await db.provenanceRecord.createMany({
      data: rows.map((d) => ({
        userId: params.userId,
        subjectType: 'memory_packet',
        subjectId: d.id,
        contentHash: d.hash,
        aiLikelihood: d.assistantShare,
        confidence: 'low',
        signals: {
          kind: 'ai_chat_import',
          import_id: params.importId,
          import_source: d.metadata.import_source,
          conversation_id: d.metadata.conversation_id,
          user_messages: d.userMessages,
          assistant_messages: d.assistantMessages,
          assistant_share: d.assistantShare,
          original_time_preserved: d.metadata.time_is_original,
        } as any,
        source: importSourceTag(d.metadata.import_source as any),
      })),
    });
  }
  return report;
}
