import { retrieve } from '@/lib/memory/rag';

export type LlamaContextNode = {
  id: string;
  text: string;
  score: number;
  packetId?: string;
  source?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Retrieval adapter for chat/cognitive layers.
 * Delegates to the production Mongo vector pipeline (L3 RAG).
 */
export async function retrieveRelevantContext(
  query: string,
  userId: string,
  filters: Record<string, unknown> = {},
) {
  const trimmed = query.trim();
  if (trimmed.length < 3) {
    return {
      nodes: [] as LlamaContextNode[],
      metadata: {
        status: 'query_too_short',
        engine: 'memory-rag',
        userId,
      },
    };
  }

  const raw = await retrieve(trimmed, { test_run_id: 'PROD', ...filters });

  if (!Array.isArray(raw)) {
    const message = (raw as { message?: string })?.message;
    return {
      nodes: [] as LlamaContextNode[],
      metadata: {
        status: message ?? 'no_results',
        engine: 'memory-rag',
        userId,
      },
    };
  }

  const nodes: LlamaContextNode[] = raw.map((hit: any, index: number) => {
    const chunks = Array.isArray(hit.context) ? hit.context : [hit.text_chunk].filter(Boolean);
    return {
      id: String(hit.packet_id ?? hit._id ?? `node-${index}`),
      packetId: hit.packet_id ? String(hit.packet_id) : undefined,
      text: chunks.join('\n'),
      score: Number(hit.score ?? 0),
      source: hit.source ? String(hit.source) : undefined,
      metadata: {
        timestamp: hit.timestamp,
        userId,
      },
    };
  });

  return {
    nodes,
    metadata: {
      status: nodes.length ? 'ok' : 'empty',
      engine: 'memory-rag',
      userId,
      count: nodes.length,
    },
  };
}
