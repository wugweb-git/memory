const mongoose = require('mongoose');

const previousVersionSchema = new mongoose.Schema(
  {
    raw: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  },
  { _id: false }
);

const itemSchema = new mongoose.Schema(
  {
    content: {
      raw: { type: String, required: true },
      type: { type: String, enum: ['text', 'link', 'file'], required: true }
    },
    source: {
      type: {
        type: String,
        enum: ['manual', 'api', 'rss', 'external', 'email'],
        required: true
      },
      platform: String,
      url: String,
      external_id: String
    },
    origin: {
      created_at: { type: Date, default: Date.now },
      created_by: { type: String, enum: ['user', 'system'], required: true }
    },
    sync: {
      last_synced_at: Date,
      has_changed: { type: Boolean, default: false },
      link_status: { type: String, enum: ['active', 'broken'], default: 'active' }
    },
    versioning: {
      current_hash: { type: String, required: true },
      previous_versions: { type: [previousVersionSchema], default: [] }
    }
  },
  {
    collection: 'items',
    strict: false
  }
);

itemSchema.index({ 'source.url': 1 }, { unique: true, sparse: true });
itemSchema.index({ 'source.external_id': 1 }, { unique: true, sparse: true });

module.exports = mongoose.models.Item || mongoose.model('Item', itemSchema);
