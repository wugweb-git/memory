import { revokeToken } from '../../lib/auth.js';
import { applyCors } from '../../middleware/requestGuards.js';

export default function handler(req, res) {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: true, type: 'validation_error', message: 'Method not allowed' });

  const header = req.headers.authorization || req.headers.Authorization;
  if (header?.startsWith('Bearer ')) revokeToken(header.slice(7));
  return res.status(200).json({ ok: true });
}
