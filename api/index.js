const mongoose = require('mongoose');
const app = require('../src/app');

let isConnected = false;

module.exports = async (req, res) => {
  if (!isConnected) {
    if (!process.env.MONGO_URI) {
      return res.status(500).json({ error: 'MONGO_URI is required' });
    }

    await mongoose.connect(process.env.MONGO_URI);
    isConnected = true;
  }

  return app(req, res);
};
