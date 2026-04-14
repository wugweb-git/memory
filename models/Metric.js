import mongoose from 'mongoose';

const metricSchema = new mongoose.Schema(
  {
    event: { type: String, required: true, index: true },
    user_id: String,
    payload: Object
  },
  { collection: 'metrics', timestamps: true, strict: false }
);

metricSchema.index({ event: 1, createdAt: -1 });

const Metric = mongoose.models.Metric || mongoose.model('Metric', metricSchema);
export default Metric;
