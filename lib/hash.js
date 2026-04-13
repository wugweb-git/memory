const crypto = require('crypto');

function hashRaw(raw) {
  return crypto.createHash('sha256').update(raw || '').digest('hex');
}

module.exports = { hashRaw };
