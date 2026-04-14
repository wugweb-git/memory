import mongoose from 'mongoose';
import crypto from 'crypto';

function contentHash(value) {
  return crypto.createHash('sha256').update(value || '').digest('hex');
}

const previousVersionSchema = new mongoose.Schema(
  {
    content: {
      raw: { type: String, required: true },
      type: { type: String, enum: ['text', 'link'], required: true }
    },
    timestamp: { type: Date, default: Date.now }
  },
  { _id: false }
);

const itemSchema = new mongoose.Schema(
  {
    content: {
      raw: { type: String, required: true },
      type: { type: String, enum: ['text', 'link'], required: true, default: 'text' }
    },
    source: {
      type: {
        type: String,
        enum: ['manual', 'api', 'rss', 'legacy'],
        required: true,
        default: 'manual'
      },
      platform: String,
      url: { type: String, sparse: true },
      external_id: { type: String, sparse: true }
    },
    origin: {
      created_at: { type: Date, default: Date.now },
      created_by: { type: String, enum: ['user', 'system'], default: 'user' }
    },
    sync: {
      last_synced_at: Date,
      has_changed: { type: Boolean, default: false },
      link_status: {
        type: String,
        enum: ['active', 'broken', 'unknown'],
        default: 'unknown'
      }
    },
    versioning: {
      current_hash: { type: String, required: true },
      previous_versions: { type: [previousVersionSchema], default: [] }
    }
  },
  {
    timestamps: true,
    strict: false,
    collection: 'items'
  }
);

itemSchema.index(
  { 'source.url': 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { 'source.url': { $exists: true, $type: 'string' } }
  }
);

itemSchema.index(
  { 'source.external_id': 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { 'source.external_id': { $exists: true, $type: 'string' } }
  }
);

itemSchema.statics.contentHash = contentHash;

export default mongoose.models.Item || mongoose.model('Item', itemSchema);
