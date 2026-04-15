import { createBaseDoc, readStore, touch, updateStore } from './store.js';
import { fail } from './errors.js';
import { getAuthUser } from './auth.js';
import { hashRaw } from './hash.js';

const TRUST_BANDS = {
  manual_input: 1,
  system_source: 0.85,
  structured_feed: 0.65,
  scraped_unknown: 0.4
};

const PRIORITY_ORDER = { critical: 4, high: 3, medium: 2, low: 1 };
const PACKET_TYPES = new Set(['email', 'activity', 'document', 'note', 'log', 'unknown']);
const HOLD_REASONS = Object.freeze({
  TRUST_GATE: 'low_trust_low_priority',
  SCHEMA: 'schema_mismatch',
  CORRUPTED: 'corrupted_upload',
  DUPLICATE: 'duplicate_import'
});

function normalizedPriority(priority = 'medium') {
  return PRIORITY_ORDER[priority] ? priority : 'medium';
}

function normalizedTrust(value, sourceType) {
  if (Number.isFinite(Number(value))) {
    return Math.max(0, Math.min(1, Number(value)));
  }
  if (sourceType === 'manual_input') return TRUST_BANDS.manual_input;
  if (sourceType === 'system_source') return TRUST_BANDS.system_source;
  if (sourceType === 'structured_feed') return TRUST_BANDS.structured_feed;
  return TRUST_BANDS.scraped_unknown;
}

function toIso(value) {
  const candidate = value ? new Date(value) : new Date();
  return Number.isNaN(candidate.getTime()) ? new Date().toISOString() : candidate.toISOString();
}

function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function sourceDefaults(payload = {}) {
  const sourceType = String(payload.source_type || 'scraped_unknown').trim();
  const trustScore = normalizedTrust(payload.trust_score, sourceType);
  return {
    source_id: String(payload.source_id || `src_${sourceType}`).trim(),
    source_type: sourceType,
    trust_score: trustScore,
    priority_level: normalizedPriority(payload.priority_level),
    ingestion_mode: String(payload.ingestion_mode || 'stream').trim() || 'stream'
  };
}

function normalizePacketBySource({ source, payload }) {
  const raw = isObject(payload.raw_payload) ? payload.raw_payload : payload;

  if (source.source_id.toLowerCase().includes('gmail') || source.source_type === 'gmail') {
    const body = String(raw.body || payload.body || '').trim();
    return {
      type: 'email',
      content: body,
      metadata: {
        sender: String(raw.sender || payload.sender || '').trim(),
        subject: String(raw.subject || payload.subject || '').trim()
      }
    };
  }

  if (source.source_id.toLowerCase().includes('github') || source.source_type === 'github') {
    const content = String(raw.commit_message || raw.message || payload.commit_message || '').trim();
    return {
      type: 'activity',
      content,
      metadata: {
        repo: String(raw.repo || payload.repo || '').trim(),
        commit_id: String(raw.commit_id || payload.commit_id || payload.external_id || '').trim(),
        timestamp: toIso(raw.timestamp || payload.timestamp)
      }
    };
  }

  if (['spotify', 'fit', 'fitness'].includes(source.source_type)) {
    return {
      type: 'activity',
      content: String(raw.summary || payload.summary || payload.content || '').trim(),
      metadata: {
        duration: Number(raw.duration || payload.duration || 0) || 0,
        category: String(raw.category || payload.category || source.source_type).trim()
      }
    };
  }

  if (source.source_type === 'document' || payload.file_reference || payload.file_path) {
    return {
      type: 'document',
      content: String(payload.file_reference || payload.file_path || payload.file_name || '').trim(),
      metadata: {
        file_type: String(payload.file_type || raw.file_type || 'unknown').trim(),
        size: Number(payload.size || raw.size || 0) || 0,
        original_name: String(payload.file_name || raw.original_name || '').trim()
      }
    };
  }

  return {
    type: PACKET_TYPES.has(payload.type) ? payload.type : 'unknown',
    content: String(payload.content || payload.raw || raw.body || raw.message || '').trim(),
    metadata: isObject(payload.metadata) ? payload.metadata : {}
  };
}

function validateNormalizedPacket(packet) {
  if (!PACKET_TYPES.has(packet.type)) return { valid: false, reason: HOLD_REASONS.SCHEMA };
  if (packet.type !== 'document' && !String(packet.content || '').trim()) return { valid: false, reason: HOLD_REASONS.SCHEMA };
  if (!isObject(packet.metadata)) return { valid: false, reason: HOLD_REASONS.SCHEMA };
  if (packet.type === 'document' && String(packet.content || '').length < 2) return { valid: false, reason: HOLD_REASONS.CORRUPTED };
  return { valid: true };
}

function extractRawContent(payload = {}) {
  if (typeof payload.raw === 'string') return payload.raw.trim();
  if (isObject(payload.raw_payload)) return JSON.stringify(payload.raw_payload);
  if (typeof payload.content === 'string') return payload.content.trim();
  return JSON.stringify(payload);
}

function shouldHold(source) {
  return source.trust_score < 0.5 && source.priority_level === 'low';
}

function estimatePacketSize(packet) {
  return Buffer.byteLength(JSON.stringify(packet), 'utf8');
}

function packetHash(packet) {
  return hashRaw(`${packet.source.source_id}:${packet.type}:${packet.content}:${JSON.stringify(packet.metadata)}`);
}

function canAccessSensitive(user, sensitivity, permission) {
  if (sensitivity !== 'restricted') return true;
  return user?.role === 'admin' || permission === 'allow_restricted';
}

export async function ingestManagedPacket(req) {
  const user = await getAuthUser(req);
  if (!user) throw fail('unauthorized', 'auth_error', 401);

  const payload = req.body || {};
  const source = sourceDefaults(payload);
  const normalized = normalizePacketBySource({ source, payload });
  const status = validateNormalizedPacket(normalized);

  const packetBase = {
    source,
    type: normalized.type,
    raw_content: extractRawContent(payload),
    normalized_content: {
      type: normalized.type,
      content: normalized.content,
      metadata: normalized.metadata
    },
    content: normalized.content,
    metadata: normalized.metadata,
    priority: source.priority_level,
    trust_score: source.trust_score,
    ingestion_mode: source.ingestion_mode,
    owner: { user_id: String(user._id), email: user.email },
    sensitivity: String(payload.sensitivity || 'internal'),
    governance: {
      normalized: status.valid,
      ingestion_state: status.valid ? 'accepted' : 'hold',
      hold_reason: status.valid ? '' : status.reason,
      ingestion_path: `ingest:${source.source_type}->normalize:${normalized.type}->store:${status.valid ? 'hot' : 'hold'}`,
      trace: [{ event: 'normalized', at: new Date().toISOString(), by: String(user._id) }]
    },
    retries: [],
    timestamps: {
      event_at: toIso(payload.event_at || payload.timestamp),
      ingested_at: new Date().toISOString()
    },
    lifecycle: {
      tier: 'hot',
      archived_at: null,
      restored_at: null,
      expires_at: payload.expires_at ? toIso(payload.expires_at) : null,
      last_accessed_at: new Date().toISOString()
    },
    storage: {
      hash: '',
      bytes: 0,
      dedup_group: null,
      is_duplicate: false
    }
  };

  if (shouldHold(source)) {
    packetBase.governance.ingestion_state = 'hold';
    packetBase.governance.hold_reason = HOLD_REASONS.TRUST_GATE;
  }

  const store = await readStore();
  const projected = { ...packetBase };
  projected.storage.hash = packetHash(projected);
  const duplicate = store.memory_packets.find((p) => p.storage?.hash === projected.storage.hash && p.governance?.ingestion_state !== 'rejected');

  if (duplicate) {
    projected.storage.dedup_group = duplicate.storage?.dedup_group || duplicate._id;
    projected.storage.is_duplicate = true;
    projected.governance.ingestion_state = 'hold';
    projected.governance.hold_reason = HOLD_REASONS.DUPLICATE;
  }

  projected.storage.bytes = estimatePacketSize(projected);

  const packet = createBaseDoc('pkt', projected);

  await updateStore((next) => {
    next.source_registry = next.source_registry || [];
    next.memory_packets = next.memory_packets || [];
    next.memory_holds = next.memory_holds || [];
    next.lifecycle_events = next.lifecycle_events || [];

    const existingSource = next.source_registry.find((s) => s.source_id === source.source_id);
    if (!existingSource) {
      next.source_registry.push(createBaseDoc('src', {
        ...source,
        connection_status: 'connected',
        last_sync: new Date().toISOString(),
        failure_count: packet.governance.ingestion_state === 'hold' ? 1 : 0
      }));
    } else {
      existingSource.last_sync = new Date().toISOString();
      if (packet.governance.ingestion_state === 'hold') existingSource.failure_count = (existingSource.failure_count || 0) + 1;
      touch(existingSource);
    }

    next.memory_packets.push(packet);

    if (packet.governance.ingestion_state === 'hold') {
      next.memory_holds.push(createBaseDoc('hold', {
        packet_id: packet._id,
        reason: packet.governance.hold_reason,
        source_id: source.source_id
      }));
    }

    next.lifecycle_events.push(createBaseDoc('lfc', {
      packet_id: packet._id,
      action: 'ingested',
      status: packet.governance.ingestion_state,
      reason: packet.governance.hold_reason
    }));
  });

  return {
    code: packet.governance.ingestion_state === 'accepted' ? 201 : 202,
    body: {
      status: packet.governance.ingestion_state,
      packet,
      trust_gate: { trust_score: source.trust_score, priority: source.priority_level }
    }
  };
}

export async function getMemoryPanel(req) {
  const user = await getAuthUser(req);
  if (!user) throw fail('unauthorized', 'auth_error', 401);

  const store = await readStore();
  const packets = (store.memory_packets || []).filter((p) => user.role === 'admin' || p.owner?.user_id === String(user._id));

  const query = req.query || {};
  const type = String(query.type || '').trim();
  const sourceId = String(query.source || '').trim();
  const priority = String(query.priority || '').trim();
  const state = String(query.state || '').trim();

  let filtered = [...packets];
  if (type) filtered = filtered.filter((p) => p.type === type);
  if (sourceId) filtered = filtered.filter((p) => p.source?.source_id === sourceId);
  if (priority) filtered = filtered.filter((p) => p.priority === priority);
  if (state) filtered = filtered.filter((p) => p.governance?.ingestion_state === state);

  const byType = {};
  const bySource = {};
  const byPriority = {};
  let totalBytes = 0;

  for (const packet of packets) {
    byType[packet.type] = (byType[packet.type] || 0) + (packet.storage?.bytes || 0);
    bySource[packet.source?.source_id || 'unknown'] = (bySource[packet.source?.source_id || 'unknown'] || 0) + (packet.storage?.bytes || 0);
    byPriority[packet.priority] = (byPriority[packet.priority] || 0) + 1;
    totalBytes += packet.storage?.bytes || 0;
  }

  const hardLimitBytes = 1024 * 1024 * 512;
  const usagePct = hardLimitBytes ? Math.round((totalBytes / hardLimitBytes) * 10000) / 100 : 0;
  const pressure = usagePct >= 95 ? 'hard_limit' : usagePct >= 85 ? 'warning' : usagePct >= 70 ? 'soft_limit' : 'normal';

  const acceptedCount = packets.filter((p) => p.governance?.ingestion_state === 'accepted').length;
  const failedCount = packets.filter((p) => ['rejected', 'deleted'].includes(p.governance?.ingestion_state)).length;
  const heldPackets = packets.filter((p) => p.governance?.ingestion_state === 'hold');
  const backlog = (store.processing_jobs || []).filter((job) => !['done', 'complete'].includes(String(job.status || '').toLowerCase()));
  const lastSync = packets[0]?.updatedAt || packets[0]?.createdAt || null;

  return {
    code: 200,
    body: {
      global_system_bar: {
        total_storage_used_bytes: totalBytes,
        remaining_storage_bytes: Math.max(hardLimitBytes - totalBytes, 0),
        ingestion_rate_recent: `${acceptedCount}/${Math.max(packets.length, 1)} accepted`,
        processing_queue_status: `${backlog.length} pending`,
        active_sources_count: (store.source_registry || []).length,
        system_status: pressure === 'hard_limit' ? 'critical' : pressure === 'warning' ? 'warning' : 'healthy'
      },
      system_overview: {
        storage_breakdown: {
          documents: byType.document || 0,
          activity: byType.activity || 0,
          content: (byType.note || 0) + (byType.email || 0) + (byType.unknown || 0)
        },
        packet_count: {
          total: packets.length,
          recent_24h: packets.filter((p) => Date.now() - new Date(p.createdAt).getTime() < 1000 * 60 * 60 * 24).length
        },
        ingestion_results: {
          success: acceptedCount,
          failed: failedCount,
          held: heldPackets.length
        },
        processing_backlog: backlog.length,
        last_sync_time: lastSync
      },
      storage_manager: {
        total_used_bytes: totalBytes,
        remaining_bytes: Math.max(hardLimitBytes - totalBytes, 0),
        usage_percent: usagePct,
        pressure,
        breakdown: {
          documents: byType.document || 0,
          activity: byType.activity || 0,
          content: (byType.note || 0) + (byType.email || 0) + (byType.unknown || 0)
        },
        limits: { soft: 70, warning: 85, hard: 95 }
      },
      data_explorer: {
        total: filtered.length,
        packets: filtered.slice(0, 200)
      },
      packet_inspector: {
        supported_fields: [
          'raw_content',
          'normalized_content',
          'source',
          'governance.ingestion_path',
          'timestamps.event_at',
          'timestamps.ingested_at',
          'governance.ingestion_state',
          'retries',
          'storage.hash',
          '_id'
        ]
      },
      ingestion_monitor: {
        incoming_recent: packets.slice(0, 25).map((p) => ({
          packet_id: p._id,
          source_id: p.source?.source_id,
          decision: p.governance?.ingestion_state === 'blob' ? 'REDIRECT' : String(p.governance?.ingestion_state || '').toUpperCase(),
          hold_reason: p.governance?.hold_reason || '',
          retries: p.retries?.length || 0,
          time: p.createdAt
        })),
        failures: failedCount,
        retries_total: packets.reduce((sum, p) => sum + (p.retries?.length || 0), 0)
      },
      cleanup_panel: {
        duplicates: packets.filter((p) => p.storage?.is_duplicate).length,
        old_low_priority: packets.filter((p) => p.priority === 'low' && Date.now() - new Date(p.createdAt).getTime() > 1000 * 60 * 60 * 24 * 30).length,
        held_items: packets.filter((p) => p.governance?.ingestion_state === 'hold').length
      },
      source_trust_panel: (store.source_registry || []).map((s) => ({
        source_id: s.source_id,
        source_type: s.source_type,
        connection_status: s.connection_status || 'connected',
        last_sync: s.last_sync || null,
        failure_count: s.failure_count || 0,
        trust_score: s.trust_score,
        priority_level: s.priority_level,
        ingestion_mode: s.ingestion_mode
      })),
      documents_manager: {
        groups: {
          certificates: filtered.filter((p) => p.type === 'document' && String(p.metadata?.category || '').toLowerCase().includes('certificate')),
          medical: filtered.filter((p) => p.type === 'document' && String(p.metadata?.category || '').toLowerCase().includes('medical')),
          tax: filtered.filter((p) => p.type === 'document' && String(p.metadata?.category || '').toLowerCase().includes('tax'))
        },
        secure_storage_indicator: true
      },
      import_panel: {
        last_import: (store.memory_imports || []).slice(-1)[0] || null
      },
      export_panel: {
        last_export: (store.memory_exports || []).slice(-1)[0] || null
      },
      review_queue: {
        hold_items: heldPackets.slice(0, 100),
        failed_items: packets.filter((p) => ['rejected', 'deleted'].includes(p.governance?.ingestion_state)).slice(0, 100),
        correction_queue: heldPackets.filter((p) => p.governance?.hold_reason === HOLD_REASONS.SCHEMA).slice(0, 100)
      },
      processing_monitor: {
        queue_size: backlog.length,
        processing_rate: backlog.length ? `${Math.max(1, acceptedCount)}/${packets.length || 1}` : 'idle',
        failures: (store.processing_jobs || []).filter((job) => String(job.status || '').toLowerCase() === 'failed').length
      },
      end_to_end_trace_view: packets.slice(0, 100).map((p) => ({
        packet_id: p._id,
        trace: {
          blob: `blob://memory/${p._id}`,
          memory: p.governance?.ingestion_state,
          processing: (store.processing_jobs || []).find((job) => String(job.packet_id) === String(p._id))?.status || 'queued',
          signals: (store.ingest_events || []).filter((evt) => String(evt.packet_id) === String(p._id)).slice(0, 3)
        }
      })),
      actions: pressure === 'hard_limit' ? ['restrict_ingestion', 'alert_user', 'suggest_cleanup'] : pressure === 'warning' ? ['alert_user', 'suggest_cleanup'] : ['normal']
    }
  };
}

export async function reclassifyData(req) {
  const user = await getAuthUser(req);
  if (!user) throw fail('unauthorized', 'auth_error', 401);

  const { packet_id, type, priority, ownership_user_id } = req.body || {};
  if (!packet_id) throw fail('packet_id is required', 'validation_error', 400);
  const isAdmin = user.role === 'admin';

  let updated;
  await updateStore((next) => {
    const packet = (next.memory_packets || []).find((p) => String(p._id) === String(packet_id));
    if (!packet) throw fail('packet not found', 'validation_error', 404);
    if (!isAdmin && packet.owner?.user_id !== String(user._id)) throw fail('forbidden', 'auth_error', 403);
    if (type) packet.type = PACKET_TYPES.has(type) ? type : packet.type;
    if (priority) packet.priority = normalizedPriority(priority);
    if (ownership_user_id) {
      if (!isAdmin) throw fail('admin required for ownership changes', 'auth_error', 403);
      packet.owner = packet.owner || {};
      packet.owner.user_id = String(ownership_user_id);
    }
    packet.governance.trace.push({ event: 'reclassified', at: new Date().toISOString(), by: String(user._id) });
    touch(packet);
    updated = packet;
  });

  return { code: 200, body: { status: 'reclassified', packet: updated } };
}

export async function mergePackets(req) {
  const user = await getAuthUser(req);
  if (!user) throw fail('unauthorized', 'auth_error', 401);

  const { packet_ids = [] } = req.body || {};
  if (!Array.isArray(packet_ids) || packet_ids.length < 2) throw fail('packet_ids must have at least two ids', 'validation_error', 400);

  let merged;
  await updateStore((next) => {
    const packets = (next.memory_packets || []).filter((p) => packet_ids.includes(String(p._id)));
    if (packets.length < 2) throw fail('not enough packets found', 'validation_error', 404);

    const primary = packets[0];
    const mergedContent = packets.map((p) => p.content).filter(Boolean).join('\n---\n');
    const mergedMetadata = Object.assign({}, ...packets.map((p) => p.metadata || {}));
    primary.content = mergedContent;
    primary.metadata = mergedMetadata;
    primary.storage.hash = packetHash(primary);
    primary.storage.bytes = estimatePacketSize(primary);
    primary.governance.trace.push({ event: 'merged', at: new Date().toISOString(), by: String(user._id), from: packet_ids.slice(1) });
    touch(primary);

    for (const packet of packets.slice(1)) {
      packet.governance.ingestion_state = 'merged';
      packet.governance.trace.push({ event: 'merged_into', at: new Date().toISOString(), target: String(primary._id) });
      touch(packet);
    }

    merged = primary;
  });

  return { code: 200, body: { status: 'merged', packet: merged } };
}

export async function moveToBlob(req) {
  const user = await getAuthUser(req);
  if (!user) throw fail('unauthorized', 'auth_error', 401);

  const { packet_id, reason = 'incorrect_ingestion' } = req.body || {};
  if (!packet_id) throw fail('packet_id is required', 'validation_error', 400);

  await updateStore((next) => {
    next.memory_blob = next.memory_blob || [];
    const packet = (next.memory_packets || []).find((p) => String(p._id) === String(packet_id));
    if (!packet) throw fail('packet not found', 'validation_error', 404);

    packet.governance.ingestion_state = 'blob';
    packet.governance.trace.push({ event: 'moved_to_blob', at: new Date().toISOString(), by: String(user._id), reason });
    touch(packet);

    next.memory_blob.push(createBaseDoc('blob', {
      packet_id: packet._id,
      reason,
      archived_payload_ref: `blob://memory/${packet._id}`
    }));
  });

  return { code: 200, body: { status: 'moved_to_blob', packet_id } };
}

export async function restoreFromArchive(req) {
  const user = await getAuthUser(req);
  if (!user) throw fail('unauthorized', 'auth_error', 401);

  const { packet_id } = req.body || {};
  if (!packet_id) throw fail('packet_id is required', 'validation_error', 400);

  let restored;
  await updateStore((next) => {
    const packet = (next.memory_packets || []).find((p) => String(p._id) === String(packet_id));
    if (!packet) throw fail('packet not found', 'validation_error', 404);
    packet.lifecycle.tier = 'hot';
    packet.lifecycle.restored_at = new Date().toISOString();
    packet.governance.trace.push({ event: 'restored_from_archive', at: new Date().toISOString(), by: String(user._id) });
    touch(packet);
    restored = packet;
  });

  return { code: 200, body: { status: 'restored', packet: restored } };
}

function applyExportFilters(packets, filters = {}) {
  const type = filters.type ? String(filters.type) : '';
  const domain = filters.domain ? String(filters.domain).toLowerCase() : '';
  const from = filters.time_from ? new Date(filters.time_from).getTime() : 0;
  const to = filters.time_to ? new Date(filters.time_to).getTime() : Number.MAX_SAFE_INTEGER;

  return packets.filter((packet) => {
    if (type && packet.type !== type) return false;
    const created = new Date(packet.createdAt).getTime();
    if (created < from || created > to) return false;
    if (domain) {
      const text = `${packet.source?.source_id || ''} ${packet.metadata?.category || ''} ${packet.metadata?.repo || ''}`.toLowerCase();
      if (!text.includes(domain)) return false;
    }
    return true;
  });
}

export async function exportData(req) {
  const user = await getAuthUser(req);
  if (!user) throw fail('unauthorized', 'auth_error', 401);

  const { filters = {}, format = 'json', permission = '' } = req.body || {};
  const store = await readStore();
  const packets = (store.memory_packets || []).filter((p) => user.role === 'admin' || p.owner?.user_id === String(user._id));
  const filtered = applyExportFilters(packets, filters).filter((packet) => canAccessSensitive(user, packet.sensitivity, permission));

  let payload;
  if (format === 'csv') {
    const columns = ['packet_id', 'type', 'priority', 'source_id', 'content', 'created_at'];
    const rows = filtered.map((p) => [p._id, p.type, p.priority, p.source?.source_id, JSON.stringify(p.content), p.createdAt]);
    payload = [columns.join(','), ...rows.map((r) => r.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))].join('\n');
  } else if (format === 'zip_bundle') {
    payload = {
      bundle_type: 'document_bundle',
      generated_at: new Date().toISOString(),
      documents: filtered.filter((p) => p.type === 'document').map((p) => ({ reference: p.content, metadata: p.metadata })),
      metadata: filtered.map((p) => ({ packet_id: p._id, source: p.source?.source_id, priority: p.priority }))
    };
  } else if (format === 'profile') {
    payload = {
      profile: {
        user_id: String(user._id),
        exported_at: new Date().toISOString(),
        highlights: filtered.slice(0, 25).map((p) => ({ type: p.type, summary: String(p.content).slice(0, 160), metadata: p.metadata }))
      }
    };
  } else {
    payload = filtered;
  }

  await updateStore((next) => {
    next.memory_exports = next.memory_exports || [];
    next.memory_exports.push(createBaseDoc('exp', {
      user_id: String(user._id),
      filters,
      format,
      count: filtered.length,
      restricted_included: permission === 'allow_restricted'
    }));
  });

  return { code: 200, body: { status: 'export_ready', format, count: filtered.length, payload } };
}

function parseBulkRows(body = {}) {
  if (Array.isArray(body.rows)) return body.rows;
  if (Array.isArray(body.packets)) return body.packets;
  if (typeof body.csv === 'string') {
    const [headerLine, ...lines] = body.csv.trim().split('\n').filter(Boolean);
    const headers = headerLine.split(',').map((h) => h.trim());
    return lines.map((line) => {
      const parts = line.split(',');
      const row = {};
      headers.forEach((header, index) => {
        row[header] = parts[index] || '';
      });
      return row;
    });
  }
  return [];
}

export async function importData(req) {
  const user = await getAuthUser(req);
  if (!user) throw fail('unauthorized', 'auth_error', 401);

  const body = req.body || {};
  const mode = String(body.mode || 'manual').toLowerCase();
  const rows = mode === 'bulk' ? parseBulkRows(body) : [body];
  const chunkSize = Math.max(1, Math.min(Number(body.chunk_size || 50), 200));

  const summary = { total: rows.length, processed: 0, accepted: 0, held: 0, rejected: 0, progress: 0 };

  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);
    for (const row of chunk) {
      try {
        const pseudoReq = { ...req, body: row };
        const result = await ingestManagedPacket(pseudoReq);
        summary.processed += 1;
        if (result.body.status === 'accepted') summary.accepted += 1;
        else summary.held += 1;
      } catch {
        summary.processed += 1;
        summary.rejected += 1;
      }
    }
    summary.progress = Math.round((summary.processed / Math.max(summary.total, 1)) * 100);
  }

  await updateStore((next) => {
    next.memory_imports = next.memory_imports || [];
    next.memory_imports.push(createBaseDoc('imp', {
      user_id: String(user._id),
      mode,
      summary
    }));
  });

  return { code: 200, body: { status: 'import_complete', mode, ...summary } };
}

export async function optimizeMemoryStorage(req) {
  const user = await getAuthUser(req);
  if (!user) throw fail('unauthorized', 'auth_error', 401);
  if (user.role !== 'admin') throw fail('admin required', 'auth_error', 403);

  let archived = 0;
  let cleaned = 0;

  await updateStore((next) => {
    next.memory_packets = next.memory_packets || [];
    next.memory_archive = next.memory_archive || [];

    const now = Date.now();
    const seenRefs = new Set();

    for (const packet of next.memory_packets) {
      const ageDays = (now - new Date(packet.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      if (packet.priority === 'low' && ageDays > 30 && packet.lifecycle.tier !== 'archive') {
        packet.lifecycle.tier = 'archive';
        packet.lifecycle.archived_at = new Date().toISOString();
        packet.governance.trace.push({ event: 'archived', at: new Date().toISOString(), by: String(user._id) });
        archived += 1;
      }
      if (packet.type === 'document') seenRefs.add(packet.content);

      if (packet.lifecycle?.expires_at && new Date(packet.lifecycle.expires_at).getTime() < now) {
        packet.governance.ingestion_state = 'deleted';
        packet.governance.trace.push({ event: 'expired_cleanup', at: new Date().toISOString(), by: 'system' });
        cleaned += 1;
      }

      touch(packet);
    }

    const beforeBlob = (next.memory_blob || []).length;
    next.memory_blob = (next.memory_blob || []).filter((blobRef) => seenRefs.has(blobRef.archived_payload_ref) || String(blobRef.reason).includes('incorrect_ingestion'));
    cleaned += beforeBlob - next.memory_blob.length;
  });

  return { code: 200, body: { status: 'optimized', archived, cleaned } };
}

export async function setSourceTrust(req) {
  const user = await getAuthUser(req);
  if (!user || user.role !== 'admin') throw fail('admin required', 'auth_error', 403);

  const { source_id, trust_score, priority_level } = req.body || {};
  if (!source_id) throw fail('source_id is required', 'validation_error', 400);

  let source;
  await updateStore((next) => {
    next.source_registry = next.source_registry || [];
    const found = next.source_registry.find((s) => s.source_id === source_id);
    if (!found) throw fail('source not found', 'validation_error', 404);
    if (trust_score !== undefined) found.trust_score = normalizedTrust(trust_score, found.source_type);
    if (priority_level) found.priority_level = normalizedPriority(priority_level);
    touch(found);
    source = found;
  });

  return { code: 200, body: { status: 'updated', source } };
}
