import { config } from '../config/config.js';

export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    version: config.appVersion,
    endpoints: [
      '/api/test',
      '/api/items',
      '/api/sync',
      '/api/sync/run',
      '/api/email',
      '/api/health',
      '/api/health/system',
      '/api/sources',
      '/api/relations',
      '/api/logs',
      '/api/admin/stats',
      '/api/upload',
      '/api/files/delete',
      '/api/admin/backup',
      '/api/auth/signup',
      '/api/auth/login',
      '/api/auth/me',
      '/api/auth/logout'
    ]
  });
}
