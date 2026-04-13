export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    endpoints: [
      '/api/test',
      '/api/items',
      '/api/sync',
      '/api/email',
      '/api/health',
      '/api/logs',
      '/api/auth/signup',
      '/api/auth/login',
      '/api/auth/me',
      '/api/auth/logout'
    ]
  });
}
