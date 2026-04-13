const app = require('../src/server');

module.exports = function handler(req, res) {
  return app(req, res);
};
