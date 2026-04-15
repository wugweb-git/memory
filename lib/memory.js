import crypto from 'crypto';
import { fail } from './errors.js';
import { getAuthUser } from './auth.js';
import { writeLog } from './log.js';
import { createBaseDoc, readStore, touch, updateStore } from './store.js';
import { sanitizeString } from '../middleware/requestGuards.js';

const TRUST_BY_SOURCE = {
  manual: 0.95,
  api: 0.85,
  webhook: 0.8,
  github: 0.88,
  figma: 0.86,
  gmail: 0.86,
  gdocs: 0.84,
  calendar: 0.84,
  rss: 0.6,
  scraper: 0.35,
  unknown: 0.25
};

const RESTRICTED_TYPES = new Set(['medical', 'tax', 'legal', 'certificate', 'certificates']);
const ALERT_THRESHOLDS = [70, 85, 95];
const MAX_QUEUE_SIZE = 5000;
const SOURCE_RATE_LIMIT_PER_MIN = 240;
const SOURCE_MODE_DEFAULTS = {
  github: { mode: 'realtime', frequency: 'webhook' },
  figma: { mode: 'realtime', frequency: 'webhook' },
  gmail: { mode: 'batch', frequency: '5m' },
  gdocs: { mode: 'pull', frequency: '10m' },
  calendar: { mode: 'batch', frequency: '15m' },
  rss: { mode: 'batch', frequency: '30m' },
  manual: { mode: 'manual', frequency: 'on_demand' },
  api: { mode: 'realtime', frequency: 'webhook' },
  unknown: { mode: 'manual', frequency: 'on_demand' }
};

function nowIso() {
  return new Date().toISOString();
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function deriveTrust(sourceType = 'unknown') {
  return TRUST_BY_SOURCE[sourceType] ?? TRUST_BY_SOURCE.unknown;
}

function safeJson(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value ?? '');
  }
}

function stableHash(value) {
  return crypto.createHash('sha256').update(safeJson(value)).digest('hex');
}

function isUrlLike(value) {
  if (!value || typeof value !== 'string') return false;
  return /^https?:\/\//i.test(value.trim());
}

function detectStructuredLink(url = '') {
  const clean = String(url || '').toLowerCase();
  if (!clean) return { is_link: false, structured: false, unknown: false };
  const structured = clean.includes('/rss') || clean.includes('.xml') || clean.includes('api.');
  return {
    is_link: isUrlLike(clean),
    structured,
    unknown: isUrlLike(clean) && !structured
  };
}

function deriveSensitivity(raw = {}) {
  const explicit = sanitizeString(raw.sensitivity || raw?.metadata?.sensitivity || '');
  if (explicit && ['public', 'private', 'restricted'].includes(explicit)) return explicit;
  const loweredType = sanitizeString(raw.type || '').toLowerCase();
  return RESTRICTED_TYPES.has(loweredType) ? 'restricted' : 'private';
}

function derivePriority(raw = {}) {
  const priority = sanitizeString(raw.priority || '').toLowerCase();
  if (['critical', 'high', 'medium', 'low'].includes(priority)) return priority;
  return deriveSensitivity(raw) === 'restricted' ? 'critical' : 'medium';
}

function estimatePacketBytes(packet) {
  return Buffer.byteLength(safeJson(packet), 'utf8');
}

function storageMonitorForUser(store, userId) {
  const userPackets = store.memory_packets.filter((p) => p.owner?.user_id === userId && !p.deleted);
  const usageBytes = userPackets.reduce((sum, row) => sum + Number(row.size_bytes || 0), 0);
  const capacityBytes = 250 * 1024 * 1024;
  const usagePercent = (usageBytes / capacityBytes) * 100;

  const alerts = ALERT_THRESHOLDS.filter((threshold) => usagePercent >= threshold).map((threshold) => ({
    threshold,
    event: 'storage.threshold',
    level: threshold >= 95 ? 'critical' : threshold >= 85 ? 'high' : 'warning'
  }));

  return {
    used_bytes: usageBytes,
    total_bytes: capacityBytes,
    remaining_bytes: Math.max(0, capacityBytes - usageBytes),
    usage_percent: Number(usagePercent.toFixed(2)),
    ingestion_blocked: usagePercent >= 95,
    ingestion_restricted: usagePercent >= 85,
    alerts
  };
}

function growthRateForUser(store, userId) {
  const packets = store.memory_packets
    .filter((row) => row.owner?.user_id === userId && !row.deleted)
    .sort((a, b) => new Date(a.ingestion_time) - new Date(b.ingestion_time));
  if (packets.length < 2) return 0;
  const firstAt = new Date(packets[0].ingestion_time).getTime();
  const lastAt = new Date(packets[packets.length - 1].ingestion_time).getTime();
  const daySpan = Math.max(1, (lastAt - firstAt) / (1000 * 60 * 60 * 24));
  return Number((packets.length / daySpan).toFixed(2));
}

function validateRawPacket(raw = {}) {
  if (!raw || typeof raw !== 'object') throw fail('packet payload is required', 'validation_error', 400);
  if (!raw.source && !raw.source_type) throw fail('source or source_type is required', 'validation_error', 400);
  if (!raw.content && !raw.raw_content && !raw.raw_payload) throw fail('content or raw_content or raw_payload is required', 'validation_error', 400);
}

function resolveConflict(packet, existing) {
  if (!existing) return { action: 'insert', reason: 'new_packet' };
  if (existing.hash === packet.hash) return { action: 'ignore', reason: 'identical_hash' };
  if (existing.source_id === packet.source_id && existing.event_time === packet.event_time) {
    return { action: 'merge', reason: 'same_source_and_time' };
  }
  if (packet.source === 'manual') return { action: 'insert_flagged', reason: 'manual_duplicate_allowed' };
  return { action: 'ignore', reason: 'duplicate_candidate' };
}

function gateDecision({ raw, sourceTrustScore, schemaCompatible, hasDuplicate, sensitivity, storageState }) {
  if (storageState.ingestion_blocked) {
    return { decision: 'REJECT', reason: 'storage_capacity_blocked' };
  }

  if (!schemaCompatible) {
    return { decision: 'REDIRECT', reason: 'schema_incompatible' };
  }

  if (hasDuplicate) {
    return { decision: 'REJECT', reason: 'duplicate_detected' };
  }

  const completenessSignals = [
    raw.content,
    raw.raw_content,
    raw.raw_payload,
    raw.source_id,
    raw.event_time,
    raw.timestamp
  ].filter(Boolean).length;

  if (completenessSignals < 2) {
    return { decision: 'HOLD', reason: 'incomplete_packet' };
  }

  if (raw.requires_manual_review || sourceTrustScore < 0.35) {
    return { decision: 'HOLD', reason: 'low_trust_source' };
  }

  const linkCheck = detectStructuredLink(String(raw.link || raw.url || raw.content || ''));
  if (linkCheck.unknown) {
    return { decision: 'HOLD', reason: 'unknown_link_requires_manual_confirmation' };
  }

  if (sensitivity === 'restricted' && raw.source_type === 'unknown_url') {
    return { decision: 'HOLD', reason: 'restricted_unknown_source' };
  }

  if (storageState.ingestion_restricted && sourceTrustScore < 0.8) {
    return { decision: 'REDIRECT', reason: 'restricted_mode_redirect' };
  }

  return { decision: 'ACCEPT', reason: 'passed_gate' };
}

function normalizePacket(raw = {}, userId, sourceModel = {}) {
  const ingestionTime = nowIso();
  const source = sanitizeString(raw.source || raw.source_type || 'unknown').toLowerCase();
  const sourceId = sanitizeString(raw.source_id || raw.external_id || raw.event_id || `src_${crypto.randomUUID()}`);
  const eventTime = raw.event_time || raw.timestamp || ingestionTime;
  const content = raw.content ?? raw.raw_content ?? raw.raw_payload ?? {};
  const metadata = {
    ...(raw.metadata || {}),
    type: sanitizeString(raw.type || raw?.metadata?.type || 'activity'),
    source,
    tags: Array.isArray(raw.tags) ? raw.tags.slice(0, 25).map((tag) => sanitizeString(String(tag))) : [],
    category: sanitizeString(raw.category || ''),
    ingestion_mode: sourceModel.mode || sanitizeString(raw.ingestion_mode || 'manual')
  };

  const sensitivity = deriveSensitivity({ ...raw, metadata });
  const trustScore = clamp(Number(sourceModel.trust_score ?? raw.source_trust_score ?? deriveTrust(source)), 0, 1);
  const packet = {
    _id: createBaseDoc('pkt')._id,
    id: sanitizeString(raw.id || `pkt_${crypto.randomUUID()}`),
    type: metadata.type,
    source,
    source_id: sourceId,
    event_time: new Date(eventTime).toISOString(),
    timestamp: new Date(eventTime).toISOString(),
    ingestion_time: ingestionTime,
    last_updated: ingestionTime,
    content,
    metadata,
    ownership: ['owned', 'observed', 'external'].includes(raw.ownership) ? raw.ownership : 'observed',
    sensitivity,
    priority: derivePriority({ ...raw, sensitivity }),
    confidence: clamp(Number(raw.confidence ?? trustScore), 0, 1),
    status: 'normalized',
    trace: {
      origin: sanitizeString(raw?.trace?.origin || source),
      ingestion_path: sanitizeString(raw?.trace?.ingestion_path || `${source}->n8n->gate->normalize->memory`),
      retry_count: Number(raw?.trace?.retry_count ?? 0),
      parent_origin_id: raw?.trace?.parent_origin_id || null,
      source_fingerprint: stableHash(`${source}:${sourceId}`),
      transformations: ['schema_enforced', 'timestamps_normalized', 'metadata_attached']
    },
    hash: stableHash({ source, sourceId, eventTime, content }),
    encryption_required: sensitivity === 'restricted',
    ai_access: sensitivity === 'restricted' ? 'blocked' : 'allowed',
    owner: { user_id: userId },
    errors: []
  };

  packet.size_bytes = estimatePacketBytes(packet);
  return packet;
}

function hasLoopRisk(packet, store, userId) {
  const parentId = packet.trace?.parent_origin_id;
  if (!parentId) return false;
  const ancestor = store.memory_packets.find((row) => row.owner?.user_id === userId && (row.id === parentId || row._id === parentId));
  if (!ancestor) return false;
  const sameFingerprint = ancestor.trace?.source_fingerprint && ancestor.trace?.source_fingerprint === packet.trace?.source_fingerprint;
  return Boolean(sameFingerprint && ancestor.source === packet.source);
}

function retryPlan(retryCount = 0) {
  const delayMs = Math.min(60000, 1000 * (2 ** retryCount));
  return {
    retry_count: retryCount + 1,
    next_retry_at: new Date(Date.now() + delayMs).toISOString(),
    delay_ms: delayMs
  };
}

function maskRestrictedForLog(packet) {
  if (packet.sensitivity !== 'restricted') return packet;
  return {
    ...packet,
    content: '[RESTRICTED]',
    metadata: { ...packet.metadata, masked: true }
  };
}

async function ensureMemorySource(req, userId, sourceType) {
  const explicit = req.body?.source_model || {};
  const sourceId = sanitizeString(explicit.source_id || req.body?.source_id || `src_${sourceType}`);
  let source;

  await updateStore((store) => {
    source = store.sources.find((item) => item.user_id === userId && item.source_id === sourceId);
    if (!source) {
      const sourceDefaults = SOURCE_MODE_DEFAULTS[sourceType] || SOURCE_MODE_DEFAULTS.unknown;
      source = createBaseDoc('src', {
        user_id: userId,
        source_id: sourceId,
        source_type: sourceType,
        mode: sanitizeString(explicit.mode || req.body?.ingestion_mode || sourceDefaults.mode),
        frequency: sanitizeString(explicit.frequency || sourceDefaults.frequency),
        retry_policy: explicit.retry_policy || { max_attempts: 5, strategy: 'exponential_backoff' },
        fallback_behavior: sanitizeString(explicit.fallback_behavior || 'hold'),
        trust_score: clamp(Number(explicit.trust_score ?? deriveTrust(sourceType)), 0, 1),
        auth_state: sanitizeString(explicit.auth_state || 'connected'),
        last_sync: '',
        failure_count: 0,
        last_minute_window_start: Date.now(),
        ingested_in_window: 0,
        enabled: true
      });
      store.sources.push(source);
    }
  });

  return source;
}

export async function ingestMemoryPacket(req) {
  const user = await getAuthUser(req);
  if (!user) throw fail('unauthorized', 'auth_error', 401);

  const raw = req.body || {};
  validateRawPacket(raw);
  const userId = String(user._id);
  const sourceType = sanitizeString(raw.source || raw.source_type || 'unknown').toLowerCase();
  const sourceModel = await ensureMemorySource(req, userId, sourceType);

  const store = await readStore();
  const storageState = storageMonitorForUser(store, userId);

  const normalizedPreview = normalizePacket(raw, userId, sourceModel);
  if (hasLoopRisk(normalizedPreview, store, userId)) {
    const loopError = fail('ingestion loop prevented', 'validation_error', 409);
    loopError.reason = 'loop_prevention_triggered';
    throw loopError;
  }
  const duplicate = store.memory_packets.find((packet) => packet.owner?.user_id === userId
      && (packet.hash === normalizedPreview.hash
        || (packet.source_id === normalizedPreview.source_id && packet.event_time === normalizedPreview.event_time)));

  const gate = gateDecision({
    raw,
    sourceTrustScore: Number(sourceModel.trust_score || 0),
    schemaCompatible: Boolean(normalizedPreview.id && normalizedPreview.source && normalizedPreview.content !== undefined),
    hasDuplicate: Boolean(duplicate),
    sensitivity: normalizedPreview.sensitivity,
    storageState
  });

  const ingestionId = `ing_${crypto.randomUUID()}`;
  const conflict = resolveConflict(normalizedPreview, duplicate);

  let persistedPacket = null;
  await updateStore((next) => {
    const logEntry = createBaseDoc('ing', {
      ingestion_id: ingestionId,
      user_id: userId,
      source: normalizedPreview.source,
      source_id: normalizedPreview.source_id,
      decision: gate.decision,
      reason: gate.reason,
      conflict: conflict.reason,
      retry_count: Number(raw?.trace?.retry_count ?? 0),
      packet_hash: normalizedPreview.hash
    });
    next.ingestion_logs.unshift(logEntry);
    next.ingestion_logs = next.ingestion_logs.slice(0, 5000);

    const source = next.sources.find((item) => item.user_id === userId && item.source_id === sourceModel.source_id);
    if (source) {
      const now = Date.now();
      if (now - Number(source.last_minute_window_start || 0) > 60000) {
        source.last_minute_window_start = now;
        source.ingested_in_window = 0;
      }
      source.ingested_in_window = Number(source.ingested_in_window || 0) + 1;
      if (source.ingested_in_window > SOURCE_RATE_LIMIT_PER_MIN) {
        gate.decision = 'HOLD';
        gate.reason = 'source_rate_limited';
      }
      source.last_sync = nowIso();
      if (gate.decision === 'REJECT') source.failure_count = Number(source.failure_count || 0) + 1;
      if (gate.decision === 'HOLD' || gate.decision === 'REDIRECT') source.failure_count = Number(source.failure_count || 0) + 1;
      touch(source);
    }

    if (gate.decision === 'ACCEPT') {
      if (conflict.action === 'ignore') {
        persistedPacket = duplicate;
        return;
      }

      if (conflict.action === 'merge' && duplicate) {
        duplicate.content = normalizedPreview.content;
        duplicate.metadata = { ...duplicate.metadata, ...normalizedPreview.metadata };
        duplicate.last_updated = nowIso();
        duplicate.status = 'stored';
        duplicate.trace.retry_count = normalizedPreview.trace.retry_count;
        duplicate.errors = [];
        duplicate.size_bytes = estimatePacketBytes(duplicate);
        touch(duplicate);
        persistedPacket = duplicate;
      } else {
        normalizedPreview.status = 'stored';
        if (conflict.action === 'insert_flagged') normalizedPreview.metadata.duplicate_flag = true;
        next.memory_packets.push(normalizedPreview);
        persistedPacket = normalizedPreview;
      }

      next.activity_stream.unshift(createBaseDoc('act', {
        user_id: userId,
        packet_id: persistedPacket._id,
        source: persistedPacket.source,
        type: persistedPacket.type,
        status: persistedPacket.status,
        event_time: persistedPacket.event_time
      }));
      next.activity_stream = next.activity_stream.slice(0, 10000);

      if (['document', 'certificate', 'medical', 'tax', 'contract'].includes(String(persistedPacket.type).toLowerCase())) {
        next.documents.push(createBaseDoc('doc', {
          user_id: userId,
          packet_id: persistedPacket._id,
          type: persistedPacket.type,
          title: sanitizeString(raw.title || persistedPacket.metadata?.title || persistedPacket.type),
          file_reference: sanitizeString(raw.file_reference || raw.file_url || ''),
          encryption_required: persistedPacket.encryption_required,
          restricted_access: persistedPacket.sensitivity === 'restricted'
        }));
      }
    } else if (gate.decision === 'REDIRECT') {
      next.blob_buffer.push(createBaseDoc('blb', {
        user_id: userId,
        packet_id: normalizedPreview._id,
        reason: gate.reason,
        raw_payload: raw,
        status: 'blob'
      }));
    } else if (gate.decision === 'HOLD') {
      const plan = retryPlan(Number(raw?.trace?.retry_count ?? 0));
      next.retry_queue.push(createBaseDoc('rty', {
        user_id: userId,
        packet_id: normalizedPreview._id,
        raw_payload: raw,
        reason: gate.reason,
        status: 'hold',
        retry_count: plan.retry_count,
        next_retry_at: plan.next_retry_at,
        auto_retry_enabled: normalizedPreview.sensitivity !== 'restricted'
      }));
      if (next.retry_queue.length > MAX_QUEUE_SIZE) next.retry_queue = next.retry_queue.slice(-MAX_QUEUE_SIZE);
    }

    if (gate.decision !== 'ACCEPT') {
      next.activity_stream.unshift(createBaseDoc('act', {
        user_id: userId,
        packet_id: normalizedPreview._id,
        source: normalizedPreview.source,
        type: normalizedPreview.type,
        status: gate.decision.toLowerCase(),
        event_time: normalizedPreview.event_time
      }));
      next.activity_stream = next.activity_stream.slice(0, 10000);
    }

    const storageStateNext = storageMonitorForUser(next, userId);
    storageStateNext.alerts.forEach((alert) => {
      next.metrics.push(createBaseDoc('met', {
        user_id: userId,
        event: 'storage.threshold',
        payload: { threshold: alert.threshold, usage_percent: storageStateNext.usage_percent }
      }));
    });
    if (gate.decision !== 'ACCEPT') {
      next.metrics.push(createBaseDoc('met', {
        user_id: userId,
        event: 'ingestion.failure',
        payload: { reason: gate.reason, source: normalizedPreview.source, decision: gate.decision }
      }));
    }
    if (gate.decision === 'REJECT' || gate.decision === 'HOLD') {
      next.metrics.push(createBaseDoc('met', {
        user_id: userId,
        event: 'source.error',
        payload: { source_id: normalizedPreview.source_id, source: normalizedPreview.source, reason: gate.reason }
      }));
    }
  });

  await writeLog({
    action: 'memory.ingest',
    user_id: userId,
    path: req.url,
    response: {
      ingestion_id: ingestionId,
      decision: gate.decision,
      reason: gate.reason,
      packet: persistedPacket ? maskRestrictedForLog(persistedPacket) : null
    }
  });

  const statusCode = gate.decision === 'ACCEPT' ? 201 : gate.decision === 'REJECT' ? 409 : 202;
  return {
    code: statusCode,
    body: {
      ingestion_id: ingestionId,
      decision: gate.decision,
      reason: gate.reason,
      conflict: conflict.reason,
      packet: persistedPacket,
      storage: storageMonitorForUser(await readStore(), userId)
    }
  };
}

export async function listMemoryPackets(req) {
  const user = await getAuthUser(req);
  if (!user) throw fail('unauthorized', 'auth_error', 401);

  const userId = String(user._id);
  const status = sanitizeString(req.query?.status || '');
  const source = sanitizeString(req.query?.source || '');
  const type = sanitizeString(req.query?.type || '');
  const page = Math.max(parseInt(req.query?.page || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query?.limit || '20', 10), 1), 100);

  const store = await readStore();
  let packets = store.memory_packets.filter((row) => row.owner?.user_id === userId && !row.deleted);
  if (status) packets = packets.filter((row) => row.status === status);
  if (source) packets = packets.filter((row) => row.source === source);
  if (type) packets = packets.filter((row) => row.type === type);
  packets.sort((a, b) => new Date(b.ingestion_time) - new Date(a.ingestion_time));

  const total = packets.length;
  const rows = packets.slice((page - 1) * limit, page * limit);

  return {
    code: 200,
    body: {
      rows,
      total,
      page,
      limit,
      has_more: page * limit < total
    }
  };
}

export async function memoryMonitor(req) {
  const user = await getAuthUser(req);
  if (!user) throw fail('unauthorized', 'auth_error', 401);
  const userId = String(user._id);
  const store = await readStore();

  const packets = store.memory_packets.filter((row) => row.owner?.user_id === userId && !row.deleted);
  const retries = store.retry_queue.filter((row) => row.user_id === userId);
  const holds = retries.filter((row) => row.status === 'hold');
  const failed = retries.filter((row) => row.status === 'failed');
  const sources = store.sources.filter((row) => row.user_id === userId);
  const activity = store.activity_stream.filter((row) => row.user_id === userId).slice(0, 50);
  const documents = store.documents.filter((row) => row.user_id === userId).slice(0, 100);

  return {
    code: 200,
    body: {
      stats: {
        packet_count: packets.length,
        hold_count: holds.length,
        failed_count: failed.length,
        retry_queue_count: retries.length,
        source_count: sources.length,
        item_count: packets.length,
        growth_rate_per_day: growthRateForUser(store, userId),
        ingestion_logs: store.ingestion_logs.filter((row) => row.user_id === userId).slice(0, 50)
      },
      storage: storageMonitorForUser(store, userId),
      sources,
      activity,
      documents,
      review_queue: {
        hold: holds,
        failed,
        correction: packets.filter((row) => row.status === 'corrupted' || row.status === 'partial').slice(0, 100)
      }
    }
  };
}

export async function updateMemorySource(req) {
  const user = await getAuthUser(req);
  if (!user) throw fail('unauthorized', 'auth_error', 401);
  const userId = String(user._id);

  const { source_id, source_type, mode, frequency, retry_policy, fallback_behavior, trust_score, auth_state, enabled } = req.body || {};
  if (!source_id && !source_type) throw fail('source_id or source_type is required', 'validation_error', 400);

  let row;
  await updateStore((store) => {
    row = store.sources.find((source) => source.user_id === userId
      && (source.source_id === source_id || source.source_type === source_type));

    if (!row) {
      const sourceDefaults = SOURCE_MODE_DEFAULTS[sanitizeString(source_type || 'unknown')] || SOURCE_MODE_DEFAULTS.unknown;
      row = createBaseDoc('src', {
        user_id: userId,
        source_id: sanitizeString(source_id || `src_${source_type}`),
        source_type: sanitizeString(source_type || 'unknown'),
        mode: sanitizeString(mode || sourceDefaults.mode),
        frequency: sanitizeString(frequency || sourceDefaults.frequency),
        retry_policy: retry_policy || { max_attempts: 5, strategy: 'exponential_backoff' },
        fallback_behavior: sanitizeString(fallback_behavior || 'hold'),
        trust_score: clamp(Number(trust_score ?? deriveTrust(source_type)), 0, 1),
        auth_state: sanitizeString(auth_state || 'connected'),
        last_sync: '',
        failure_count: 0,
        last_minute_window_start: Date.now(),
        ingested_in_window: 0,
        enabled: enabled !== false
      });
      store.sources.push(row);
    } else {
      row.mode = sanitizeString(mode || row.mode || 'manual');
      row.frequency = sanitizeString(frequency || row.frequency || 'on_demand');
      row.retry_policy = retry_policy || row.retry_policy || { max_attempts: 5, strategy: 'exponential_backoff' };
      row.fallback_behavior = sanitizeString(fallback_behavior || row.fallback_behavior || 'hold');
      if (trust_score !== undefined && trust_score !== null) row.trust_score = clamp(Number(trust_score), 0, 1);
      row.auth_state = sanitizeString(auth_state || row.auth_state || 'connected');
      row.enabled = typeof enabled === 'boolean' ? enabled : row.enabled;
      touch(row);
    }
  });

  return { code: 201, body: row };
}

export async function replayIngestion(req) {
  const user = await getAuthUser(req);
  if (!user) throw fail('unauthorized', 'auth_error', 401);

  const packetId = sanitizeString(req.body?.packet_id || '');
  if (!packetId) throw fail('packet_id is required', 'validation_error', 400);

  const store = await readStore();
  const queueRow = store.retry_queue.find((row) => row.user_id === String(user._id)
      && (row.packet_id === packetId || row._id === packetId));

  if (!queueRow) throw fail('packet not found in retry queue', 'validation_error', 404);
  if (queueRow.auto_retry_enabled === false) throw fail('restricted packets require manual correction', 'validation_error', 400);

  const replayReq = {
    ...req,
    body: {
      ...(queueRow.raw_payload || {}),
      trace: {
        ...(queueRow.raw_payload?.trace || {}),
        retry_count: Number(queueRow.retry_count || 0) + 1,
        origin: queueRow.raw_payload?.trace?.origin || 'replay',
        ingestion_path: `${queueRow.raw_payload?.trace?.ingestion_path || 'retry_queue'}->replay`
      }
    }
  };

  const response = await ingestMemoryPacket(replayReq);

  await updateStore((next) => {
    const target = next.retry_queue.find((row) => row._id === queueRow._id);
    if (!target) return;
    if (response.body.decision === 'ACCEPT') {
      target.status = 'replayed';
    } else {
      const plan = retryPlan(Number(target.retry_count || 0));
      target.status = 'hold';
      target.retry_count = plan.retry_count;
      target.next_retry_at = plan.next_retry_at;
    }
    touch(target);
  });

  return response;
}

export async function packetAction(req) {
  const user = await getAuthUser(req);
  if (!user) throw fail('unauthorized', 'auth_error', 401);

  const { packet_id, action, metadata } = req.body || {};
  if (!packet_id) throw fail('packet_id is required', 'validation_error', 400);
  if (!action) throw fail('action is required', 'validation_error', 400);

  const userId = String(user._id);
  const store = await readStore();
  const packet = store.memory_packets.find((row) => row.owner?.user_id === userId && (row._id === packet_id || row.id === packet_id));
  if (!packet) throw fail('packet not found', 'validation_error', 404);

  await updateStore((next) => {
    const target = next.memory_packets.find((row) => row._id === packet._id);
    if (!target) return;

    if (action === 'delete') {
      target.deleted = true;
      target.status = 'failed';
      touch(target);
      return;
    }

    if (action === 'move_to_blob') {
      target.status = 'failed';
      next.blob_buffer.push(createBaseDoc('blb', {
        user_id: userId,
        packet_id: target._id,
        reason: 'manual_move',
        raw_payload: target,
        status: 'blob'
      }));
      touch(target);
      return;
    }

    if (action === 'reprocess') {
      target.status = 'retry_pending';
      next.retry_queue.push(createBaseDoc('rty', {
        user_id: userId,
        packet_id: target._id,
        raw_payload: target,
        reason: 'manual_reprocess',
        status: 'hold',
        retry_count: Number(target.trace?.retry_count || 0),
        next_retry_at: nowIso(),
        auto_retry_enabled: target.sensitivity !== 'restricted'
      }));
      touch(target);
      return;
    }

    if (action === 'edit_metadata') {
      target.metadata = {
        ...target.metadata,
        ...(metadata || {})
      };
      target.last_updated = nowIso();
      target.status = 'corrected';
      touch(target);
      return;
    }

    throw fail('invalid action', 'validation_error', 400);
  });

  return { code: 200, body: { ok: true, action, packet_id } };
}
