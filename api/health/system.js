import { connectDB } from '../../lib/db.js';
import { config } from '../../config/config.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: true, type: 'validation_error', message: 'Method not allowed' });

  const started = Date.now();
  try {
    await connectDB();
    return res.status(200).json({ ok: true, uptime_s: process.uptime(), env: config.env, version: config.appVersion, latency_ms: Date.now() - started });
  } catch (error) {
    return res.status(500).json({ error: true, type: 'system_error', message: error.message });
  }
}
