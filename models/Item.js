import mongoose from 'mongoose';

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
      type: { type: String, enum: ['text', 'link', 'file', 'email'], required: true }
    },
    source: {
      type: { type: String, enum: ['manual', 'api', 'rss', 'external', 'email'], required: true },
      platform: String,
      url: String,
      external_id: String
    },
    owner: {
      user_id: String,
      email: String
    },
    visibility: { type: String, enum: ['private', 'public'], default: 'private' },
    origin: {
      created_at: { type: Date, default: Date.now },
      created_by: { type: String, enum: ['user', 'system'], required: true }
    },
    sync: {
      last_synced_at: Date,
      has_changed: { type: Boolean, default: false },
      link_status: { type: String, enum: ['active', 'broken'], default: 'active' },
      error_reason: String
    },
    versioning: {
      current_hash: { type: String, required: true },
      previous_versions: { type: [previousVersionSchema], default: [] }
    },
    archived: { type: Boolean, default: false }
  },
  {
    collection: 'items',
    strict: false
  }
);

itemSchema.index({ 'source.url': 1, 'owner.user_id': 1 }, { unique: true, sparse: true });
itemSchema.index({ 'source.external_id': 1, 'owner.user_id': 1 }, { unique: true, sparse: true });
itemSchema.index({ archived: 1, 'origin.created_at': -1 });

const Item = mongoose.models.Item || mongoose.model('Item', itemSchema);
export default Item;
