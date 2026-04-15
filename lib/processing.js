import crypto from 'crypto';
import { fail } from './errors.js';
import { getAuthUser } from './auth.js';
import { createBaseDoc, readStore, touch, updateStore } from './store.js';

const PROCESSING_VERSION = 'layer2-v1';
const MAX_CHUNK_SIZE = 600;
const CHUNK_OVERLAP = 80;
const RETRY_BASE_MS = 30_000;

const INTENTS = [
  { name: 'build', terms: ['build', 'implement', 'ship', 'create', 'develop'] },
  { name: 'learn', terms: ['learn', 'study', 'understand', 'research'] },
  { name: 'publish', terms: ['publish', 'release', 'announce', 'share'] },
  { name: 'explore', terms: ['explore', 'investigate', 'brainstorm', 'discover'] }
];

const DOMAIN_KEYWORDS = {
  ai: ['ai', 'llm', 'agent', 'machine learning', 'model', 'embedding', 'rag'],
  fintech: ['fintech', 'payment', 'bank', 'finance', 'trading', 'risk'],
  ux: ['ux', 'ui', 'design', 'figma', 'usability', 'interaction'],
  engineering: ['api', 'backend', 'frontend', 'typescript', 'database', 'queue'],
  product: ['roadmap', 'kpi', 'user story', 'launch', 'feature']
};

function tokenize(text = '') {
  return String(text).toLowerCase().split(/[^a-z0-9_+#.-]+/).filter(Boolean);
}

function extractIntent(text = '') {
  const lower = text.toLowerCase();
  for (const intent of INTENTS) {
    if (intent.terms.some((term) => lower.includes(term))) return intent.name;
  }
  return 'explore';
}

function inferContext(packet) {
  const explicit = packet?.external_metadata?.raw_payload?.context;
  if (explicit) return String(explicit);
  if (packet.source?.type === 'telemetry_event') return 'activity';
  if (packet.source?.type === 'spirit_note') return 'project';
  return 'personal';
}

function detectDomains(text = '') {
  const lower = text.toLowerCase();
  const scored = Object.entries(DOMAIN_KEYWORDS)
    .map(([domain, words]) => ({ domain, score: words.reduce((sum, w) => sum + (lower.includes(w) ? 1 : 0), 0) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return {
    primary_domain: scored[0]?.domain || 'general',
    secondary_domains: scored.slice(1, 4).map((d) => d.domain)
  };
}

function extractEntities(packet, tokens) {
  const rawPayload = packet?.external_metadata?.raw_payload || {};
  const candidateEntities = [
    packet.source?.platform,
    rawPayload.tool,
    rawPayload.company,
    ...(Array.isArray(rawPayload.entities) ? rawPayload.entities : [])
  ].filter(Boolean).map((e) => String(e));

  const titlecase = String(packet.content?.raw || '').match(/\b[A-Z][a-zA-Z0-9+.-]{2,}\b/g) || [];
  const entities = [...new Set([...candidateEntities, ...titlecase].slice(0, 20))];
  const topics = [...new Set(tokens.filter((tok) => tok.length >= 5).slice(0, 12))];
  return { topics, entities };
}

function makeChunks(text = '') {
  const clean = String(text).replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const chunks = [];
  let idx = 0;
  while (idx < clean.length) {
    const chunk = clean.slice(idx, idx + MAX_CHUNK_SIZE);
    chunks.push(chunk);
    idx += MAX_CHUNK_SIZE - CHUNK_OVERLAP;
  }
  return [...new Set(chunks)];
}

function redactSensitive(text = '') {
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]')
    .replace(/\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g, '[redacted-ssn]')
    .replace(/\b\d{13,19}\b/g, '[redacted-number]');
}

function pseudoEmbedding(chunk = '') {
  const hash = crypto.createHash('sha256').update(chunk).digest();
  const vector = [];
  for (let i = 0; i < 12; i += 1) vector.push(Number((hash[i] / 255).toFixed(6)));
  return vector;
}

function packetSensitivity(packet) {
  const value = packet?.sensitivity ?? packet?.external_metadata?.raw_payload?.sensitivity;
  return value ? String(value).toLowerCase() : 'normal';
}

function relationEdges(packet, store, domains) {
  const edges = [];
  const ownerId = packet.owner?.user_id;
  const peers = store.items
    .filter((item) => !item.archived && String(item._id) !== String(packet._id) && item.owner?.user_id === ownerId)
    .slice(0, 50);

  for (const peer of peers) {
    if (peer.profile_id && peer.profile_id === packet.profile_id) {
      edges.push({ from_packet_id: packet._id, to_packet_id: peer._id, relation: 'same_profile' });
    }
    const peerRaw = String(peer.content?.raw || '').toLowerCase();
    if (domains.primary_domain !== 'general' && peerRaw.includes(domains.primary_domain)) {
      edges.push({ from_packet_id: packet._id, to_packet_id: peer._id, relation: 'shared_domain' });
    }
  }

  if (packet.profile_id) edges.push({ from_packet_id: packet._id, to_project_id: packet.profile_id, relation: 'packet_project' });
  edges.push({ from_packet_id: packet._id, to_domain: domains.primary_domain, relation: 'packet_domain' });
  return edges.slice(0, 80);
}

function upsertByPacketId(collection, packetId, payload) {
  const index = collection.findIndex((row) => String(row.packet_id) === String(packetId));
  if (index >= 0) collection[index] = { ...collection[index], ...payload, updatedAt: new Date().toISOString() };
  else collection.push(createBaseDoc('prc', payload));
}


function canAccessPacket(packet, user) {
  return Boolean(user && packet && (user.role === 'admin' || packet.owner?.user_id === String(user._id)));
}

function filterPacketIdsForUser(store, user) {
  if (!user) return new Set();
  const visiblePacketIds = store.items
    .filter((item) => !item.archived && canAccessPacket(item, user))
    .map((item) => String(item._id));
  return new Set(visiblePacketIds);
}

function isLayer1ValidatedPacket(packet) {
  if (!packet || packet.archived) return false;
  if (!packet._id || !packet.owner?.user_id) return false;
  if (!packet.content?.raw || !packet.content?.type) return false;
  if (!packet.source?.type || !packet.source?.origin) return false;
  if (!packet.versioning?.current_hash) return false;
  return true;
}

async function processSingleJob(store, job) {
  const packet = store.items.find((i) => String(i._id) === String(job.packet_id) && !i.archived);
  if (!packet) {
    job.state = 'failed';
    job.error = 'packet_not_found';
    touch(job);
    return { status: 'failed', reason: 'packet_not_found' };
  }
  if (!isLayer1ValidatedPacket(packet)) {
    job.state = 'failed';
    job.error = 'invalid_layer1_packet';
    touch(job);
    return { status: 'failed', reason: 'invalid_layer1_packet' };
  }

  const sensitivity = packetSensitivity(packet);
  const packetId = String(packet._id);
  const now = new Date().toISOString();

  if (sensitivity === 'restricted') {
    store.signals_activity = store.signals_activity.filter((row) => String(row.packet_id) !== packetId);
    store.signals_domain = store.signals_domain.filter((row) => String(row.packet_id) !== packetId);
    store.signals_intent = store.signals_intent.filter((row) => String(row.packet_id) !== packetId);
    store.signals_momentum = store.signals_momentum.filter((row) => String(row.packet_id) !== packetId);
    store.relationships_graph = store.relationships_graph.filter((row) => String(row.packet_id) !== packetId && String(row.from_packet_id) !== packetId);
    store.embeddings = store.embeddings.filter((row) => String(row.packet_id) !== packetId);
    const processed = {
      packet_id: packetId,
      processing_version: PROCESSING_VERSION,
      status: 'processed',
      sensitivity,
      trace: { timestamp: now, source_packet_id: packetId },
      semantic: null,
      domains: null,
      enrichment: { skipped_reason: 'restricted_sensitivity' },
      vector_ready: false
    };
    upsertByPacketId(store.processed_packets, packetId, processed);
    job.state = 'processed';
    job.finished_at = now;
    touch(job);
    return { status: 'processed', restricted: true };
  }

  const raw = String(packet.content?.raw || packet.content_chunk || '').trim();
  const tokens = tokenize(raw);
  const entitiesAndTopics = extractEntities(packet, tokens);
  const intent = extractIntent(raw);
  const context = inferContext(packet);
  const domains = detectDomains(raw);
  const edges = relationEdges(packet, store, domains);

  const semantic = {
    topics: entitiesAndTopics.topics,
    entities: entitiesAndTopics.entities,
    intent,
    context
  };

  const chunks = makeChunks(redactSensitive(raw));
  const dedup = new Set();
  const embeddings = [];
  chunks.forEach((chunk, index) => {
    const hash = crypto.createHash('sha1').update(chunk).digest('hex');
    if (dedup.has(hash)) return;
    dedup.add(hash);
    embeddings.push({
      packet_id: packetId,
      chunk_index: index,
      chunk_text: chunk,
      chunk_hash: hash,
      vector: pseudoEmbedding(chunk),
      model: 'pseudo-pgvector-prep-v1',
      processing_version: PROCESSING_VERSION,
      created_at: now
    });
  });

  const processed = {
    packet_id: packetId,
    processing_version: PROCESSING_VERSION,
    status: 'processed',
    sensitivity,
    trace: { timestamp: now, source_packet_id: packetId },
    semantic,
    domains,
    enrichment: {
      inferred_tags: [...new Set([intent, context, domains.primary_domain, ...domains.secondary_domains])],
      contextual_group: `${context}:${domains.primary_domain}`
    },
    vector_ready: embeddings.length > 0
  };

  upsertByPacketId(store.processed_packets, packetId, processed);
  store.relationships_graph = store.relationships_graph.filter((r) => String(r.from_packet_id) !== packetId);
  edges.forEach((edge) => store.relationships_graph.push(createBaseDoc('rel', { ...edge, packet_id: packetId, processing_version: PROCESSING_VERSION, created_at: now })));

  store.embeddings = store.embeddings.filter((row) => String(row.packet_id) !== packetId);
  embeddings.forEach((row) => store.embeddings.push(createBaseDoc('emb', row)));

  const ownerItems = store.items.filter((i) => !i.archived && i.owner?.user_id === packet.owner?.user_id);
  const totalRecent = ownerItems.filter((i) => Date.now() - new Date(i.updatedAt || i.createdAt || 0).getTime() <= 1000 * 60 * 60 * 24 * 14).length;

  upsertByPacketId(store.signals_activity, packetId, {
    packet_id: packetId,
    processing_version: PROCESSING_VERSION,
    activity_frequency_14d: totalRecent,
    recent_activity_at: packet.updatedAt || packet.createdAt || now,
    timestamp: now
  });

  upsertByPacketId(store.signals_domain, packetId, {
    packet_id: packetId,
    processing_version: PROCESSING_VERSION,
    primary_domain: domains.primary_domain,
    secondary_domains: domains.secondary_domains,
    intensity: domains.primary_domain === 'general' ? 0.2 : 0.8,
    timestamp: now
  });

  upsertByPacketId(store.signals_intent, packetId, {
    packet_id: packetId,
    processing_version: PROCESSING_VERSION,
    intent,
    context,
    timestamp: now
  });

  const olderCount = ownerItems.filter((i) => new Date(i.updatedAt || i.createdAt || 0).getTime() < Date.now() - 1000 * 60 * 60 * 24 * 7).length;
  const momentum = totalRecent - olderCount;
  upsertByPacketId(store.signals_momentum, packetId, {
    packet_id: packetId,
    processing_version: PROCESSING_VERSION,
    trend: momentum >= 0 ? 'increasing' : 'decreasing',
    delta: momentum,
    consistency_score: Math.max(0, Math.min(1, totalRecent / 14)),
    timestamp: now
  });

  job.state = 'processed';
  job.finished_at = now;
  job.error = '';
  touch(job);

  return { status: 'processed', restricted: false, embeddings: embeddings.length };
}

export async function enqueuePacketForProcessing(packetId, options = {}) {
  const { reason = 'ingest', force = false } = options;
  await updateStore((store) => {
    const existing = store.processing_jobs.find((j) => String(j.packet_id) === String(packetId) && ['pending', 'processing'].includes(j.state));
    if (existing && !force) return;
    store.processing_jobs.push(createBaseDoc('job', {
      packet_id: String(packetId),
      state: 'pending',
      reason,
      attempts: 0,
      next_attempt_at: new Date().toISOString(),
      processing_version: PROCESSING_VERSION,
      error: ''
    }));
  });
}

export async function runProcessingQueue({ batchSize = 25 } = {}) {
  const result = { processed: 0, failed: 0, skipped: 0, jobs_total: 0 };

  await updateStore(async (store) => {
    const now = Date.now();
    const candidates = store.processing_jobs
      .filter((job) => ['pending', 'failed'].includes(job.state) && new Date(job.next_attempt_at || 0).getTime() <= now)
      .slice(0, batchSize);

    result.jobs_total = candidates.length;
    for (const job of candidates) {
      job.state = 'processing';
      job.attempts = Number(job.attempts || 0) + 1;
      job.started_at = new Date().toISOString();
      touch(job);

      try {
        const single = await processSingleJob(store, job);
        if (single.status === 'processed') result.processed += 1;
        if (single.status === 'skipped') result.skipped += 1;
      } catch (error) {
        job.state = 'failed';
        job.error = error.message;
        const delay = RETRY_BASE_MS * (2 ** Math.min(job.attempts, 6));
        job.next_attempt_at = new Date(Date.now() + delay).toISOString();
        touch(job);
        result.failed += 1;
      }
    }
  });

  return result;
}

export async function getSignalSummaries(user) {
  const store = await readStore();
  const visiblePacketIds = filterPacketIdsForUser(store, user);

  const domainDistribution = {};
  for (const row of store.signals_domain) {
    if (!visiblePacketIds.has(String(row.packet_id))) continue;
    const key = row.primary_domain || 'general';
    domainDistribution[key] = (domainDistribution[key] || 0) + 1;
  }

  const activityHeatmap = store.signals_activity
    .filter((row) => visiblePacketIds.has(String(row.packet_id)))
    .map((row) => ({ packet_id: row.packet_id, activity_frequency_14d: row.activity_frequency_14d, recent_activity_at: row.recent_activity_at }))
    .slice(-100);

  const intentDistribution = {};
  for (const row of store.signals_intent) {
    if (!visiblePacketIds.has(String(row.packet_id))) continue;
    const key = row.intent || 'explore';
    intentDistribution[key] = (intentDistribution[key] || 0) + 1;
  }

  const visibleProcessingJobs = store.processing_jobs.filter((job) => visiblePacketIds.has(String(job.packet_id)));

  return {
    processed_packets: store.processed_packets.filter((row) => visiblePacketIds.has(String(row.packet_id))).length,
    queued_packets: visibleProcessingJobs.filter((j) => j.state === 'pending').length,
    failed_packets: visibleProcessingJobs.filter((j) => j.state === 'failed').length,
    domain_distribution: domainDistribution,
    intent_distribution: intentDistribution,
    activity_heatmap: activityHeatmap
  };
}

export async function enqueueProcessingFromRequest(req) {
  const user = await getAuthUser(req);
  if (!user) throw fail('unauthorized', 'auth_error', 401);
  const itemId = req.body?.item_id;
  if (!itemId) throw fail('item_id is required', 'validation_error', 400);

  const store = await readStore();
  const packet = store.items.find((item) => String(item._id) === String(itemId) && !item.archived);
  if (!packet) throw fail('item not found', 'validation_error', 404);
  if (!canAccessPacket(packet, user)) throw fail('forbidden', 'auth_error', 403);

  await enqueuePacketForProcessing(itemId, { reason: 'manual_enqueue', force: Boolean(req.body?.force) });
  return { code: 202, body: { status: 'queued', packet_id: itemId } };
}

export async function runProcessingFromRequest(req) {
  const user = await getAuthUser(req);
  if (!user) throw fail('unauthorized', 'auth_error', 401);
  if (user.role !== 'admin') throw fail('forbidden', 'auth_error', 403);

  const batchSize = Math.max(1, Math.min(Number(req.body?.batch_size || req.query?.batch_size || 25), 100));
  const result = await runProcessingQueue({ batchSize });
  return { code: 200, body: { status: 'ok', ...result, processing_version: PROCESSING_VERSION } };
}

export async function listProcessingSignals(req) {
  const user = await getAuthUser(req);
  if (!user) throw fail('unauthorized', 'auth_error', 401);

  const summary = await getSignalSummaries(user);
  return { code: 200, body: { status: 'ok', summary } };
}
