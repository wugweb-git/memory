module.exports = function handler(req, res) {
  res.status(200).json({
    ok: true,
    endpoints: ['/api/items', '/api/sync', '/api/email', '/api/health']
  });
};
