import { Push_To_Blob, Promote_To_Memory } from '@/lib/blobLayer';

export interface EmailPayload {
  from: string;
  subject: string;
  body: string;
  to?: string;
  messageId?: string;
}

/**
 * Ingest an inbound email into Layer 0 (Blob buffer).
 *
 * Inbound email authorship is unknown (it came from someone), so it is tagged
 * `unknown` and held in the buffer for review — not auto-promoted, not trusted
 * for learning. Owner-authored mail can be promoted manually from the buffer.
 */
export async function ingestEmail(
  payload: EmailPayload,
  opts: { autoPromote?: boolean } = {}
) {
  if (!payload?.from || !payload?.body) {
    throw new Error('email ingestion requires `from` and `body`');
  }

  const item = await Push_To_Blob({
    type: 'email',
    source: 'email',
    source_id: payload.messageId ?? `${payload.from}:${payload.subject ?? ''}`,
    raw_payload: {
      from: payload.from,
      to: payload.to ?? null,
      subject: payload.subject ?? null,
      body: payload.body,
    },
    trace_json: {
      origin: 'email',
      input_mode: 'imported',
      declared_author: 'unknown',
      ingestion_path: 'ingest/email',
      received_at: new Date().toISOString(),
    },
  });

  let promotedPacketId: string | null = null;
  if (opts.autoPromote) {
    const promoted = await Promote_To_Memory(item.id);
    promotedPacketId = (promoted as any)?.id ?? null;
  }

  return {
    source: 'email',
    accepted: true,
    blob_id: item.id,
    state: item.state,
    promoted: Boolean(promotedPacketId),
    memory_packet_id: promotedPacketId,
  };
}
