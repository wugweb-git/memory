import mongoose from 'mongoose';

const healthQueueSchema = new mongoose.Schema(
  {
    item_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
      required: true
    },
    issue_type: {
      type: String,
      enum: ['broken_link'],
      default: 'broken_link',
      required: true
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'resolved'],
      default: 'pending',
      required: true
    },
    detected_at: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true,
    collection: 'health_queue'
  }
);

export default mongoose.models.HealthQueue || mongoose.model('HealthQueue', healthQueueSchema);
