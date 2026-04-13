export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    endpoints: ['/api/test', '/api/items', '/api/sync', '/api/email', '/api/health']
  });
}
