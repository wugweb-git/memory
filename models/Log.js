import mongoose from 'mongoose';

const logSchema = new mongoose.Schema(
  {
    level: { type: String, default: 'info' },
    action: { type: String, required: true },
    user_id: String,
    path: String,
    request: Object,
    response: Object,
    error: String
  },
  { collection: 'logs', timestamps: true, strict: false }
);

const Log = mongoose.models.Log || mongoose.model('Log', logSchema);
export default Log;
