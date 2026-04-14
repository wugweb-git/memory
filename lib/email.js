import { getAuthUser } from './auth.js';
import { fail } from './errors.js';
import { hashRaw } from './hash.js';
import { writeLog } from './log.js';
import { sanitizeString } from '../middleware/requestGuards.js';
import { createBaseDoc, updateStore } from './store.js';

export async function handleEmail(req) {
  const user = await getAuthUser(req);
  if (!user) throw fail('unauthorized', 'auth_error', 401);

  const subject = sanitizeString(req.body?.subject || '');
  const body = sanitizeString(req.body?.body || '');
  const from = sanitizeString(req.body?.from || '');
  const platform = sanitizeString(req.body?.platform || 'email');

  const raw = `${subject}\n\n${body}`.trim();
  if (!raw) throw fail('subject or body is required', 'validation_error', 400);

  const item = createBaseDoc('itm', {
    content: { raw, type: 'email' },
    source: { type: 'email', platform, external_id: from },
    owner: { user_id: String(user._id), email: user.email },
    visibility: 'private',
    archived: false,
    origin: { created_at: new Date().toISOString(), created_by: 'system' },
    sync: { last_synced_at: new Date().toISOString(), has_changed: false, link_status: 'active', error_reason: '' },
    versioning: { current_hash: hashRaw(raw), previous_versions: [] }
  });

  await updateStore((store) => {
    store.items.push(item);
  });

  await writeLog({ action: 'email.create', user_id: String(user._id), path: req.url, response: { id: String(item._id) } });
  return { code: 201, body: item };
}
