const mongoose = require('mongoose');

const healthSchema = new mongoose.Schema(
  {
    item_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
    link_status: { type: String, enum: ['active', 'broken'], required: true },
    checked_at: { type: Date, default: Date.now }
  },
  {
    collection: 'health',
    strict: false
  }
);

module.exports = mongoose.models.Health || mongoose.model('Health', healthSchema);
