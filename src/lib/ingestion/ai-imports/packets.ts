import { createHash } from 'node:crypto';
import { stripNullBytes } from '@/lib/memory/sanitize';
import { AI_IMPORT_SOURCES, emptySkips, isObj, toIso, type AiImportSource, type NormalizedConversation, type NormalizedMessage } from './types';
import { windowConversation } from './window';

/**
 * Normalised conversation to memory-packet drafts. The hash depends only on the
 * source, the export's own conversation id, the window index and the window
 * text, never on import time, so re-uploading the same export hashes the same
 * and creates nothing new.
 */

export interface PacketDraft {
  type: 'external';
  source: string; // import:chatgpt
  source_id: string;
  content: string;
  metadata: Record<string, unknown>;
  event_time: Date;
  hash: string;
  assistantShare: number;
  userMessages: number;
  assistantMessages: number;
}

export const importSourceTag = (s: AiImportSource) => `import:${s}`;

export function packetHash(source: AiImportSource, externalId: string, index: number, text: string): string {
  return createHash('sha256').update(`${importSourceTag(source)}\n${externalId}\n${index}\n${text}`).digest('hex');
}

export function conversationToPackets(c: NormalizedConversation, opts: { importId: string; fallbackTime: Date }): PacketDraft[] {
  // Conversation-level authorship mix, recorded in the provenance ledger for every window.
  const aiChars = c.messages.filter((m) => m.role === 'assistant').reduce((n, m) => n + m.text.length, 0);
  const allChars = c.messages.reduce((n, m) => n + m.text.length, 0);
  const shares = {
    assistantShare: allChars ? Math.round((aiChars / allChars) * 100) / 100 : 0,
    userMessages: c.messages.filter((m) => m.role === 'user').length,
    assistantMessages: c.messages.filter((m) => m.role === 'assistant').length,
  };
  return windowConversation(c).map((w) => {
    const at = w.at ?? c.startedAt;
    const parsed = at ? new Date(at) : null;
    const event_time = parsed && Number.isFinite(parsed.getTime()) ? parsed : opts.fallbackTime;
    return {
      type: 'external' as const,
      source: importSourceTag(c.source),
      source_id: `${c.externalId}#${w.index}`,
      content: w.text,
      metadata: {
        import: true,
        import_id: opts.importId,
        import_source: c.source,
        title: c.title,
        conversation_id: c.externalId,
        conversation_started_at: c.startedAt,
        window: { index: w.index, total: w.total },
        message_count: c.messages.length,
        skipped: c.skipped,
        visibility: 'private',
        time_is_original: Boolean(at && parsed && Number.isFinite(parsed.getTime())),
      },
      event_time,
      hash: packetHash(c.source, c.externalId, w.index, w.text),
      assistantShare: shares.assistantShare,
      userMessages: shares.userMessages,
      assistantMessages: shares.assistantMessages,
    };
  });
}

/* ------------------------------ request validation ------------------------------ */

export const LIMITS = {
  maxConversationsPerChunk: 200,
  maxMessagesPerConversation: 20_000,
  maxMessageChars: 200_000,
  maxChunkBytes: 900_000,
} as const;

const ROLES = new Set(['user', 'assistant', 'note', 'memory']);
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);

/** Treats the request body as untrusted: rebuilds each conversation with clamped, cleaned fields. */
export function sanitizeConversations(input: unknown): NormalizedConversation[] {
  if (!Array.isArray(input)) throw new Error('conversations must be a list');
  if (input.length > LIMITS.maxConversationsPerChunk) throw new Error(`At most ${LIMITS.maxConversationsPerChunk} conversations per request.`);
  const out: NormalizedConversation[] = [];
  for (const c of input) {
    if (!isObj(c) || !AI_IMPORT_SOURCES.includes(c.source) || typeof c.externalId !== 'string' || !c.externalId || !Array.isArray(c.messages)) continue;
    const messages: NormalizedMessage[] = [];
    for (const m of c.messages.slice(0, LIMITS.maxMessagesPerConversation)) {
      if (!isObj(m) || !ROLES.has(m.role) || typeof m.text !== 'string') continue;
      const text = stripNullBytes(m.text).slice(0, LIMITS.maxMessageChars).trim();
      if (text) messages.push({ role: m.role, text, at: toIso(m.at) });
    }
    if (!messages.length) continue;
    const sk = isObj(c.skipped) ? c.skipped : {};
    out.push({
      source: c.source,
      externalId: stripNullBytes(c.externalId).slice(0, 200),
      title: stripNullBytes(typeof c.title === 'string' ? c.title : '').slice(0, 300) || 'Untitled conversation',
      startedAt: toIso(c.startedAt),
      messages,
      skipped: { ...emptySkips(), attachments: num(sk.attachments), nonConversation: num(sk.nonConversation), empty: num(sk.empty) },
    });
  }
  return out;
}
