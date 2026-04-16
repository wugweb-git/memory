import { MemoryPacket, MemoryType, SourceType, ProcessingError } from './types';
import crypto from 'crypto';

export function normalize(raw: any, userId: string): MemoryPacket {
  const ingestionTime = new Date().toISOString();
  const source = (raw.source || raw.source_type || 'unknown').toLowerCase() as SourceType;
  const sourceId = raw.source_id || raw.external_id || `src_${crypto.randomUUID()}`;
  const eventTime = raw.event_time || raw.timestamp || ingestionTime;

  let type: MemoryType = 'external';
  let content: any = raw.content || {};
  let metadata: Record<string, any> = { ... (raw.metadata || {}) };

  // Source-specific mapping
  switch (source) {
    case 'gmail':
      type = 'email';
      content = { body: raw.content || raw.body || '' };
      metadata = {
        ...metadata,
        sender: raw.sender || raw.from || 'unknown',
        subject: raw.subject || 'no-subject',
        thread_id: raw.thread_id || null
      };
      break;

    case 'github':
      type = 'activity';
      content = { description: raw.commit_message || raw.description || '' };
      metadata = {
        ...metadata,
        repo: raw.repo || raw.repository || 'unknown',
        commit_id: raw.commit_id || raw.sha || null,
        branch: raw.branch || 'main'
      };
      break;

    case 'manual':
      type = (raw.type as MemoryType) || 'note';
      content = raw.content || '';
      break;

    case 'rss':
      type = 'activity';
      metadata = {
        ...metadata,
        link: raw.link || raw.url || null,
        feed_name: raw.feed_name || 'unknown'
      };
      break;

    default:
      type = (raw.type as MemoryType) || 'external';
  }

  const sensitivity = raw.sensitivity === 'restricted' ? 'restricted' : 'normal';
  const status = 'active';

  // DETERMINISTIC is_embeddable LOGIC
  const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
  const isEmbeddable = (
    sensitivity !== 'restricted' &&
    status === 'active' &&
    contentStr.length >= 50 &&
    !raw._noise_flagged
  );

  const packet: MemoryPacket = {
    type,
    source,
    source_id: sourceId,
    content,
    metadata: {
      ...metadata,
      normalized_at: ingestionTime
    },
    timestamps: {
      event_time: new Date(eventTime).toISOString(),
      ingestion_time: ingestionTime,
      last_updated: ingestionTime
    },
    ownership: 'self',
    sensitivity,
    priority: raw.priority || 'medium',
    confidence: Number(raw.confidence) || 1.0,
    status,
    hash: '', // Generated in service
    trace: {
      origin: raw.trace?.origin || source,
      ingestion_path: [...(raw.trace?.ingestion_path || []), `${source}->gate->normalize`],
      parent_origin_id: raw.trace?.parent_origin_id || null,
      retry_count: Number(raw.trace?.retry_count) || 0
    },
    embedding_status: 'pending',
    processing_status: 'pending',
    semantic_status: 'pending',
    retry_count: 0,
    max_retries: 2,
    is_embeddable: isEmbeddable,
    schema_version: 1,
    processing_errors: []
  };

  return packet;
}
