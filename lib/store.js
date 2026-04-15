import crypto from 'crypto';
import { getDownloadUrl, put } from '@vercel/blob';
import { config } from '../config/config.js';

const DEFAULT_STATE = {
  users: [],
  items: [],
  logs: [],
  sources: [],
  telemetry_config: [],
  blob_metadata: [],
  relations: [],
  metrics: [],
  health: [],
  ingest_events: [],
  processing_jobs: [],
  memory_packets: [],
  memory_holds: [],
  memory_blob: [],
  memory_archive: [],
  memory_exports: [],
  memory_imports: [],
  source_registry: [],
  lifecycle_events: []
};

if (!globalThis._memoryStore) {
  globalThis._memoryStore = {
    loaded: false,
    state: structuredClone(DEFAULT_STATE),
    writeChain: Promise.resolve()
  };
}

function hasBlobToken() {
  return Boolean(config.blobToken);
}

function nowIso() {
  return new Date().toISOString();
}

function nextId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

async function loadFromBlob() {
  const token = config.blobToken;
  if (!token) return;

  try {
    const { downloadUrl } = await getDownloadUrl(config.blobDataPath, { token });
    const response = await fetch(downloadUrl);
    if (!response.ok) return;
    const payload = await response.json();
    globalThis._memoryStore.state = { ...structuredClone(DEFAULT_STATE), ...payload };
  } catch {
    // keep empty state when blob does not exist yet
  }
}

async function persistToBlob() {
  if (!hasBlobToken()) return;
  const token = config.blobToken;
  const body = JSON.stringify(globalThis._memoryStore.state);
  await put(config.blobDataPath, body, {
    access: 'private',
    allowOverwrite: true,
    token,
    contentType: 'application/json'
  });
}

export async function initStore() {
  if (globalThis._memoryStore.loaded) return;
  await loadFromBlob();
  globalThis._memoryStore.loaded = true;
}

export async function readStore() {
  await initStore();
  return globalThis._memoryStore.state;
}

export async function updateStore(mutator) {
  await initStore();
  globalThis._memoryStore.writeChain = globalThis._memoryStore.writeChain.then(async () => {
    await mutator(globalThis._memoryStore.state);
    await persistToBlob();
  });
  await globalThis._memoryStore.writeChain;
  return globalThis._memoryStore.state;
}

export function createBaseDoc(prefix, extra = {}) {
  return {
    _id: nextId(prefix),
    createdAt: nowIso(),
    updatedAt: nowIso(),
    ...extra
  };
}

export function touch(doc) {
  doc.updatedAt = nowIso();
  return doc;
}
