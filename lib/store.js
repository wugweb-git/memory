import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

const STORE_PATH = path.join(process.cwd(), '.data', 'store.json');

const DEFAULT_STORE = {
  items: [],
  sources: [],
  telemetry_config: [],
  blob_metadata: [],
  memory_packets: [],
  ingestion_logs: [],
  activity_stream: [],
  documents: [],
  blob_buffer: [],
  retry_queue: [],
  metrics: []
};

let writeChain = Promise.resolve();

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function mergeDefaults(store = {}) {
  return {
    ...DEFAULT_STORE,
    ...store,
    items: Array.isArray(store.items) ? store.items : [],
    sources: Array.isArray(store.sources) ? store.sources : [],
    telemetry_config: Array.isArray(store.telemetry_config) ? store.telemetry_config : [],
    blob_metadata: Array.isArray(store.blob_metadata) ? store.blob_metadata : [],
    memory_packets: Array.isArray(store.memory_packets) ? store.memory_packets : [],
    ingestion_logs: Array.isArray(store.ingestion_logs) ? store.ingestion_logs : [],
    activity_stream: Array.isArray(store.activity_stream) ? store.activity_stream : [],
    documents: Array.isArray(store.documents) ? store.documents : [],
    blob_buffer: Array.isArray(store.blob_buffer) ? store.blob_buffer : [],
    retry_queue: Array.isArray(store.retry_queue) ? store.retry_queue : [],
    metrics: Array.isArray(store.metrics) ? store.metrics : []
  };
}

async function ensureStoreFile() {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
  try {
    await fs.access(STORE_PATH);
  } catch {
    await fs.writeFile(STORE_PATH, JSON.stringify(DEFAULT_STORE, null, 2));
  }
}

export async function readStore() {
  await ensureStoreFile();
  const raw = await fs.readFile(STORE_PATH, 'utf8');
  return mergeDefaults(JSON.parse(raw));
}

export async function updateStore(mutator) {
  writeChain = writeChain.then(async () => {
    const store = await readStore();
    await mutator(store);
    const next = mergeDefaults(store);
    await fs.writeFile(STORE_PATH, JSON.stringify(next, null, 2));
    return next;
  });

  return writeChain;
}

export function createBaseDoc(prefix = 'doc', overrides = {}) {
  const now = new Date().toISOString();
  return {
    _id: `${prefix}_${crypto.randomUUID()}`,
    createdAt: now,
    updatedAt: now,
    ...clone(overrides)
  };
}

export function touch(row) {
  if (!row || typeof row !== 'object') return row;
  const now = new Date().toISOString();
  row.updatedAt = now;
  if ('last_updated' in row) row.last_updated = now;
  return row;
}
