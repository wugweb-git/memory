import { getAuthUser } from './auth.js';
import { fail } from './errors.js';
import { hashRaw } from './hash.js';
import { writeLog } from './log.js';
import { sanitizeString } from '../middleware/requestGuards.js';
import { createBaseDoc, readStore, touch, updateStore } from './store.js';

function isUrl(raw) {
  return typeof raw === 'string' && /^https?:\/\//i.test(raw.trim());
}

async function linkStatusFor(url, contentType) {
  if (contentType !== 'link') return { status: 'active', reason: '' };
  try {
    const response = await fetch(url, { method: 'GET' });
    return response.ok ? { status: 'active', reason: '' } : { status: 'broken', reason: `HTTP ${response.status}` };
  } catch (error) {
    return { status: 'broken', reason: error.message };
  }
}

export async function syncItem(req) {
  const user = await getAuthUser(req);
  if (!user) throw fail('unauthorized', 'auth_error', 401);

  const {
    item_id,
    raw,
    url,
    external_id,
    event_id,
    platform,
    source_type = 'api',
    source_origin = '',
    raw_payload = null,
    content_chunk = '',
    embedding = null,
    master_spirit_tag = '',
    complexity_score = null,
    profile_id = ''
  } = req.body || {};
  if (!raw) throw fail('raw is required', 'validation_error', 400);

  const cleanRaw = sanitizeString(raw);
  const resolvedUrl = url || (isUrl(cleanRaw) ? cleanRaw.trim() : undefined);
  const contentType = resolvedUrl ? 'link' : 'text';
  const nextHash = hashRaw(cleanRaw);

  const store = await readStore();
  let item = store.items.find((candidate) => {
    if (candidate.archived || candidate.owner?.user_id !== String(user._id)) return false;
    if (item_id && String(candidate._id) === String(item_id)) return true;
    if (external_id && candidate.source?.external_id === sanitizeString(external_id)) return true;
    if (resolvedUrl && candidate.source?.url === resolvedUrl) return true;
    return false;
  });

  const link = await linkStatusFor(resolvedUrl, contentType);

  if (!item) {
    const created = createBaseDoc('itm', {
      content: { raw: cleanRaw, type: contentType },
      source: {
        type: sanitizeString(source_type || 'api'),
        origin: sanitizeString(source_origin || platform || ''),
        platform: sanitizeString(platform || ''),
        url: resolvedUrl,
        external_id: sanitizeString(external_id || event_id || '')
      },
      owner: { user_id: String(user._id), email: user.email },
      visibility: 'private',
      archived: false,
      profile_id: sanitizeString(profile_id) || String(user._id),
      signal_type: 'high_signal',
      external_metadata: { raw_payload: raw_payload || {} },
      analysis: {
        taxonomy_tags: master_spirit_tag ? [sanitizeString(master_spirit_tag)] : [],
        complexity_score: complexity_score === null ? null : Number(complexity_score),
        embedding: Array.isArray(embedding) ? embedding : null,
        citation_id: ''
      },
      origin: { created_at: new Date().toISOString(), created_by: 'system' },
      content_chunk: sanitizeString(content_chunk || cleanRaw),
      sync: { last_synced_at: new Date().toISOString(), has_changed: false, link_status: link.status, error_reason: link.reason, last_checked_at: new Date().toISOString() },
      versioning: { current_hash: nextHash, previous_versions: [] }
    });

    await updateStore((next) => {
      next.items.push(created);
      next.metrics.push(createBaseDoc('met', { event: 'sync_triggered', user_id: String(user._id), payload: { created: true, item_id: String(created._id) } }));
    });
    return { code: 201, body: created };
  }

  const changed = item.versioning.current_hash !== nextHash;
  await updateStore((next) => {
    const target = next.items.find((i) => String(i._id) === String(item._id));
    if (changed) {
      target.versioning.previous_versions.push({ raw: target.content.raw, timestamp: new Date().toISOString() });
      target.content.raw = cleanRaw;
      target.content.type = contentType;
      target.versioning.current_hash = nextHash;
      target.sync.has_changed = true;
    } else {
      target.sync.has_changed = false;
    }

    target.source.type = sanitizeString(source_type || 'api');
    target.source.origin = sanitizeString(source_origin || target.source.origin || target.source.platform || '');
    target.source.platform = sanitizeString(platform || target.source.platform || '');
    target.source.url = resolvedUrl || target.source.url;
    target.source.external_id = sanitizeString(external_id || event_id || target.source.external_id || '');
    target.profile_id = sanitizeString(profile_id || target.profile_id || String(user._id));
    target.external_metadata = { raw_payload: raw_payload || target.external_metadata?.raw_payload || {} };
    target.content_chunk = sanitizeString(content_chunk || target.content_chunk || cleanRaw);
    target.analysis = target.analysis || {};
    target.analysis.taxonomy_tags = master_spirit_tag ? [sanitizeString(master_spirit_tag)] : (target.analysis.taxonomy_tags || []);
    target.analysis.complexity_score = complexity_score === null ? target.analysis.complexity_score : Number(complexity_score);
    target.analysis.embedding = Array.isArray(embedding) ? embedding : (target.analysis.embedding || null);
    target.analysis.citation_id = target.analysis.citation_id || '';
    target.sync.last_synced_at = new Date().toISOString();
    target.sync.link_status = link.status;
    target.sync.error_reason = link.reason;
    target.sync.last_checked_at = new Date().toISOString();
    touch(target);

    next.metrics.push(createBaseDoc('met', { event: changed ? 'item_updated' : 'sync_triggered', user_id: String(user._id), payload: { item_id: String(target._id) } }));
  });

  await writeLog({ action: 'sync.update', user_id: String(user._id), path: req.url, response: { id: String(item._id), changed } });
  return { code: 200, body: (await readStore()).items.find((i) => String(i._id) === String(item._id)) };
}
