import { fail } from './errors.js';
import { getAuthUser } from './auth.js';
import { runAllJobsOnce } from './jobs.js';
import { sanitizeString } from '../middleware/requestGuards.js';
import { listLogs } from './log.js';
import { createBaseDoc, readStore, updateStore } from './store.js';

export async function getLogs(req) {
  const user = await getAuthUser(req);
  if (!user) throw fail('unauthorized', 'auth_error', 401);
  const limit = Math.min(Math.max(parseInt(req.query?.limit || '50', 10), 1), 200);
  return { code: 200, body: await listLogs(limit, String(user._id), user.role === 'admin') };
}

export async function listSources(req) {
  const user = await getAuthUser(req);
  if (!user) throw fail('unauthorized', 'auth_error', 401);
  const store = await readStore();
  return { code: 200, body: store.sources.filter((s) => s.user_id === String(user._id)) };
}

export async function createSource(req) {
  const user = await getAuthUser(req);
  if (!user) throw fail('unauthorized', 'auth_error', 401);

  const type = sanitizeString(req.body?.type || 'rss');
  const url = sanitizeString(req.body?.url || '');
  if (!url) throw fail('url is required', 'validation_error', 400);

  let source;
  await updateStore((store) => {
    source = store.sources.find((s) => s.user_id === String(user._id) && s.type === type && s.url === url);
    if (!source) {
      source = createBaseDoc('src', { user_id: String(user._id), type, url, status: 'idle' });
      store.sources.push(source);
    }
  });

  return { code: 201, body: source };
}

export async function runSync(req) {
  const user = await getAuthUser(req);
  if (!user) throw fail('unauthorized', 'auth_error', 401);
  const result = await runAllJobsOnce();
  return { code: 200, body: { ...result, last_global_sync: new Date().toISOString() } };
}

export async function listTelemetryConfig(req) {
  const user = await getAuthUser(req);
  if (!user) throw fail('unauthorized', 'auth_error', 401);
  const store = await readStore();
  return { code: 200, body: store.telemetry_config.filter((row) => row.user_id === String(user._id)) };
}

export async function createTelemetryConfig(req) {
  const user = await getAuthUser(req);
  if (!user) throw fail('unauthorized', 'auth_error', 401);

  const platform_name = sanitizeString(req.body?.platform_name || req.body?.platform || '');
  const webhook_secret = sanitizeString(req.body?.webhook_secret || '');
  const api_key_encrypted = sanitizeString(req.body?.api_key_encrypted || '');
  if (!platform_name) throw fail('platform_name is required', 'validation_error', 400);

  let row;
  await updateStore((store) => {
    row = store.telemetry_config.find((item) => item.user_id === String(user._id) && item.platform_name === platform_name);
    if (!row) {
      row = createBaseDoc('tel', {
        user_id: String(user._id),
        platform_name,
        webhook_secret,
        api_key_encrypted,
        last_synced_at: ''
      });
      store.telemetry_config.push(row);
    } else {
      row.webhook_secret = webhook_secret || row.webhook_secret;
      row.api_key_encrypted = api_key_encrypted || row.api_key_encrypted;
      row.updatedAt = new Date().toISOString();
    }
  });
  return { code: 201, body: row };
}

export async function listBlobMetadata(req) {
  const user = await getAuthUser(req);
  if (!user) throw fail('unauthorized', 'auth_error', 401);
  const store = await readStore();
  return { code: 200, body: store.blob_metadata.filter((row) => row.user_id === String(user._id)) };
}

export async function createBlobMetadata(req) {
  const user = await getAuthUser(req);
  if (!user) throw fail('unauthorized', 'auth_error', 401);

  const s3_url = sanitizeString(req.body?.s3_url || req.body?.blob_url || '');
  const file_type = sanitizeString(req.body?.file_type || 'unknown');
  const ocr_transcript = sanitizeString(req.body?.ocr_transcript || '');
  const uuid_reference = sanitizeString(req.body?.uuid_reference || '');
  if (!s3_url) throw fail('s3_url is required', 'validation_error', 400);

  let row;
  await updateStore((store) => {
    row = createBaseDoc('blb', {
      user_id: String(user._id),
      s3_url,
      file_type,
      ocr_transcript,
      uuid_reference
    });
    store.blob_metadata.push(row);
  });
  return { code: 201, body: row };
}
