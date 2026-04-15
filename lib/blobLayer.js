import crypto from 'crypto';
import { createBaseDoc, readStore, updateStore } from './store.js';

const SOFT_LIMIT = 70;
const WARN_LIMIT = 85;
const HARD_LIMIT = 95;
const DEFAULT_LIMIT_BYTES = Number(process.env.BLOB_LAYER_LIMIT_BYTES || 5 * 1024 * 1024);
const DEFAULT_TTL_DAYS = Number(process.env.BLOB_LAYER_TTL_DAYS || 14);
const RATE_LIMIT_COUNT = Number(process.env.BLOB_LAYER_RATE_LIMIT_COUNT || 60);
const RATE_LIMIT_WINDOW_MS = Number(process.env.BLOB_LAYER_RATE_LIMIT_WINDOW_MS || 60_000);

const rateWindow = new Map();

function nowIso() {
  return new Date().toISOString();
}

function normalizeType(type) {
  const t = String(type || 'unknown').toLowerCase();
  if (['job_description', 'article', 'note', 'dump', 'file', 'unknown'].includes(t)) return t;
  return 'unknown';
}

function normalizeSource(source) {
  const s = String(source || 'unknown').toLowerCase();
  if (['manual', 'api', 'sync', 'scrape', 'unknown'].includes(s)) return s;
  return 'unknown';
}

function computeHash(content) {
  return crypto.createHash('sha256').update(typeof content === 'string' ? content : JSON.stringify(content)).digest('hex');
}

function sizeOf(content) {
  return Buffer.byteLength(typeof content === 'string' ? content : JSON.stringify(content), 'utf8');
}

function bytesToHuman(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function usageStatus(percent) {
  if (percent >= HARD_LIMIT) return 'critical';
  if (percent >= WARN_LIMIT) return 'warning';
  return 'healthy';
}

function emitEvent(store, type, level, meta = {}) {
  store.blob_events.push(
    createBaseDoc('blob_evt', { type, level, meta, created_at: nowIso() })
  );
}

export function enforceBlobRateLimit(key = 'global') {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const events = rateWindow.get(key) || [];
  const recent = events.filter((v) => v > windowStart);
  if (recent.length >= RATE_LIMIT_COUNT) {
    throw new Error('blob.ingestion.anomaly: rate limit exceeded');
  }
  recent.push(now);
  rateWindow.set(key, recent);
}

export async function listBlobItems({ type, source, state, limit = 20, offset = 0 } = {}) {
  const store = await readStore();
  let rows = [...(store.blob_items || [])];
  if (type) rows = rows.filter((r) => r.type === normalizeType(type));
  if (source) rows = rows.filter((r) => r.source === normalizeSource(source));
  if (state) rows = rows.filter((r) => r.state === String(state));
  rows.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  return rows.slice(offset, offset + limit);
}

export async function getBlobItem(id) {
  const store = await readStore();
  return (store.blob_items || []).find((r) => r.id === id) || null;
}

export async function createBlobItem({ type, source, content, expires_at, pinned = false, source_id = 'unknown', environment = 'unknown' }) {
  const contentBytes = sizeOf(content);
  if (contentBytes > DEFAULT_LIMIT_BYTES) {
    throw new Error(`Payload too large for Blob layer (${bytesToHuman(contentBytes)} > ${bytesToHuman(DEFAULT_LIMIT_BYTES)})`);
  }

  const entry = createBaseDoc('blob', {
    id: `blob_${crypto.randomUUID()}`,
    type: normalizeType(type),
    source: normalizeSource(source),
    content,
    size_bytes: contentBytes,
    state: 'raw',
    created_at: nowIso(),
    expires_at: pinned
      ? null
      : expires_at || new Date(Date.now() + DEFAULT_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString(),
    pinned: Boolean(pinned),
    source_id,
    environment,
    duplicate_of: null,
    hash: computeHash(content)
  });

  await updateStore(async (store) => {
    const items = store.blob_items || (store.blob_items = []);
    const duplicate = items.find((r) => r.hash === entry.hash);
    if (duplicate) {
      entry.duplicate_of = duplicate.id;
      emitEvent(store, 'blob.ingestion.anomaly', 'warning', { reason: 'duplicate_detected', duplicate_of: duplicate.id });
    }
    items.push(entry);
    const stats = computeBlobStatsFromStore(store);
    if (stats.usage_percent >= WARN_LIMIT) {
      emitEvent(store, 'blob.storage.threshold', stats.status, { usage_percent: stats.usage_percent });
    }
  });

  return entry;
}

export async function patchBlobItem(id, payload = {}) {
  let updated = null;
  await updateStore(async (store) => {
    const row = (store.blob_items || []).find((r) => r.id === id);
    if (!row) return;
    const action = payload.action;
    if (action === 'promote') row.state = 'promoted';
    if (action === 'reject') row.state = 'rejected';
    if (action === 'archive') row.state = 'reviewed';
    if (action === 'pin') {
      row.pinned = true;
      row.expires_at = null;
    }
    if (payload.type) row.type = normalizeType(payload.type);
    if (payload.source) row.source = normalizeSource(payload.source);
    row.updatedAt = nowIso();
    updated = row;
  });
  return updated;
}

export async function deleteBlobItem(id) {
  let ok = false;
  await updateStore(async (store) => {
    const before = (store.blob_items || []).length;
    store.blob_items = (store.blob_items || []).filter((r) => r.id !== id);
    ok = store.blob_items.length !== before;
  });
  return ok;
}

export async function bulkBlobAction({ ids = [], action }) {
  let count = 0;
  await updateStore(async (store) => {
    const rows = store.blob_items || [];
    for (const row of rows) {
      if (!ids.includes(row.id)) continue;
      if (action === 'delete') {
        row.state = 'rejected';
      } else if (action === 'promote') {
        row.state = 'promoted';
      } else if (action === 'archive') {
        row.state = 'reviewed';
      }
      count += 1;
    }
    if (action === 'delete') {
      store.blob_items = rows.filter((r) => !ids.includes(r.id));
    }
  });
  return count;
}

export async function cleanupExpiredBlobItems() {
  let removed = 0;
  await updateStore(async (store) => {
    const now = Date.now();
    const before = (store.blob_items || []).length;
    store.blob_items = (store.blob_items || []).filter((r) => {
      if (!r.expires_at || r.pinned) return true;
      const expired = new Date(r.expires_at).getTime() <= now;
      return !expired;
    });
    removed = before - store.blob_items.length;
    if (removed > 0) {
      emitEvent(store, 'blob.cleanup.pending', 'info', { removed });
    }
  });
  return removed;
}

function computeBlobStatsFromStore(store) {
  const items = store.blob_items || [];
  const used = items.reduce((sum, row) => sum + Number(row.size_bytes || 0), 0);
  const usagePercent = Math.round((used / DEFAULT_LIMIT_BYTES) * 100);
  return {
    used_bytes: used,
    used: bytesToHuman(used),
    limit_bytes: DEFAULT_LIMIT_BYTES,
    limit: bytesToHuman(DEFAULT_LIMIT_BYTES),
    total_items: items.length,
    avg_item_size_bytes: items.length ? Math.round(used / items.length) : 0,
    usage_percent: usagePercent,
    status: usageStatus(usagePercent),
    thresholds: { soft: SOFT_LIMIT, warning: WARN_LIMIT, hard: HARD_LIMIT }
  };
}

export async function getBlobStats() {
  const store = await readStore();
  return computeBlobStatsFromStore(store);
}

export async function listBlobEvents(limit = 20) {
  const store = await readStore();
  return [...(store.blob_events || [])].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).slice(0, limit);
}
