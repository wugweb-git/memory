import mongoose from 'mongoose';

const sourceSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['rss', 'email'], required: true },
    url: { type: String, required: true },
    user_id: { type: String, required: true, index: true },
    last_synced_at: Date,
    status: { type: String, default: 'idle' }
  },
  { collection: 'sources', timestamps: true }
);

sourceSchema.index({ user_id: 1, type: 1, url: 1 }, { unique: true });

const Source = mongoose.models.Source || mongoose.model('Source', sourceSchema);
export default Source;
