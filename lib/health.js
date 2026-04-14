import { getAuthUser } from './auth.js';
import { fail } from './errors.js';
import { readStore } from './store.js';

export async function checkHealth(req) {
  const user = await getAuthUser(req);
  if (!user) throw fail('unauthorized', 'auth_error', 401);

  const store = await readStore();
  let broken = store.items.filter((item) => !item.archived && item.sync?.link_status === 'broken');
  if (user.role !== 'admin') broken = broken.filter((item) => item.owner?.user_id === String(user._id));

  broken.sort((a, b) => new Date(b.origin?.created_at || 0) - new Date(a.origin?.created_at || 0));
  return { code: 200, body: broken.slice(0, 50) };
}
