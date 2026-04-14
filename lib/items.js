import { getAuthUser } from './auth.js';
import { fail } from './errors.js';
import { hashRaw } from './hash.js';
import { writeLog } from './log.js';
import { sanitizeString } from '../middleware/requestGuards.js';
import { createBaseDoc, readStore, touch, updateStore } from './store.js';

function isUrl(raw) {
  return typeof raw === 'string' && /^https?:\/\//i.test(raw.trim());
}

async function linkStatusFor(raw, type) {
  if (type !== 'link') return { status: 'active', reason: '' };
  try {
    const response = await fetch(raw, { method: 'GET' });
    return response.ok ? { status: 'active', reason: '' } : { status: 'broken', reason: `HTTP ${response.status}` };
  } catch (error) {
    return { status: 'broken', reason: error.message };
  }
}

function canEdit(item, user) {
  return user && (user.role === 'admin' || item.owner?.user_id === String(user._id));
}

export async function getItems(req) {
  const user = await getAuthUser(req);
  if (!user) throw fail('unauthorized', 'auth_error', 401);

  const page = Math.max(parseInt(req.query?.page || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query?.limit || '20', 10), 1), 50);
  const q = sanitizeString(req.query?.q || '').toLowerCase();
  const type = sanitizeString(req.query?.type || '');
  const source = sanitizeString(req.query?.source || '');
  const scope = sanitizeString(req.query?.scope || 'my');

  const store = await readStore();
  let items = store.items.filter((item) => !item.archived);
  if (scope === 'public') items = items.filter((i) => i.visibility === 'public');
  else if (!(scope === 'all' && user.role === 'admin')) items = items.filter((i) => i.owner?.user_id === String(user._id));

  if (q) items = items.filter((i) => String(i.content?.raw || '').toLowerCase().includes(q));
  if (type) items = items.filter((i) => i.content?.type === type);
  if (source) items = items.filter((i) => i.source?.type === source);

  items.sort((a, b) => new Date(b.origin?.created_at || 0) - new Date(a.origin?.created_at || 0));
  const total = items.length;
  const rows = items.slice((page - 1) * limit, page * limit);
  return { items: rows, total, page, limit, has_more: page * limit < total };
}

export async function createItem(req) {
  const user = await getAuthUser(req);
  if (!user) throw fail('unauthorized', 'auth_error', 401);

  const { raw, visibility = 'private', platform = '', external_id = '' } = req.body || {};
  if (!raw) throw fail('raw is required', 'validation_error', 400);

  const cleanedRaw = sanitizeString(raw);
  const type = isUrl(cleanedRaw) ? 'link' : 'text';
  const url = type === 'link' ? cleanedRaw.trim() : undefined;
  const hashed = hashRaw(cleanedRaw);

  const store = await readStore();
  const existing = store.items.find((item) => !item.archived
    && item.owner?.user_id === String(user._id)
    && ((url && item.source?.url === url) || item.versioning?.current_hash === hashed));

  if (existing) {
    return { code: 200, body: { status: 'exists', is_duplicate: true, existing_item_id: String(existing._id), item: existing } };
  }

  const link = await linkStatusFor(cleanedRaw, type);
  const item = createBaseDoc('itm', {
    content: { raw: cleanedRaw, type },
    source: { type: 'manual', url, platform: sanitizeString(platform), external_id: sanitizeString(external_id) },
    owner: { user_id: String(user._id), email: user.email },
    visibility,
    archived: false,
    origin: { created_at: new Date().toISOString(), created_by: 'user' },
    sync: { last_synced_at: new Date().toISOString(), has_changed: false, link_status: link.status, error_reason: link.reason, last_checked_at: new Date().toISOString() },
    versioning: { current_hash: hashed, previous_versions: [] }
  });

  await updateStore((next) => {
    next.items.push(item);
    if (link.status === 'broken') {
      next.health.push(createBaseDoc('hlt', { item_id: item._id, link_status: 'broken', checked_at: new Date().toISOString(), error_reason: link.reason }));
    }
    next.metrics.push(createBaseDoc('met', { event: 'item_created', user_id: String(user._id), payload: { item_id: String(item._id) } }));
  });

  await writeLog({ action: 'items.create', user_id: String(user._id), path: req.url, response: { id: String(item._id) } });
  return { code: 201, body: { status: 'saved', is_duplicate: false, item } };
}

export async function deleteItem(req) {
  const user = await getAuthUser(req);
  if (!user) throw fail('unauthorized', 'auth_error', 401);
  const { item_id } = req.body || {};
  if (!item_id) throw fail('item_id is required', 'validation_error', 400);

  const store = await readStore();
  const item = store.items.find((i) => String(i._id) === String(item_id));
  if (!item || item.archived) throw fail('item not found', 'validation_error', 404);
  if (!canEdit(item, user)) throw fail('forbidden', 'auth_error', 403);

  await updateStore((next) => {
    const target = next.items.find((i) => String(i._id) === String(item_id));
    target.archived = true;
    touch(target);
  });

  await writeLog({ action: 'items.archive', user_id: String(user._id), path: req.url, request: { item_id } });
  return { code: 200, body: { status: 'deleted', archived: true, item_id } };
}
