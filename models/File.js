import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true, index: true },
    original_name: String,
    mime_type: String,
    size: Number,
    storage_path: String,
    public_url: String,
    expires_at: Date,
    deleted_at: Date
  },
  { collection: 'files', timestamps: true }
);

fileSchema.index({ user_id: 1, createdAt: -1 });

const FileMeta = mongoose.models.FileMeta || mongoose.model('FileMeta', fileSchema);
export default FileMeta;
