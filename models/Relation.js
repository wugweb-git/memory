import mongoose from 'mongoose';

const relationSchema = new mongoose.Schema(
  {
    source_item_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
    target_item_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
    type: { type: String, default: 'related' }
  },
  { collection: 'relations', timestamps: true }
);

relationSchema.index({ source_item_id: 1, target_item_id: 1, type: 1 }, { unique: true });

const Relation = mongoose.models.Relation || mongoose.model('Relation', relationSchema);
export default Relation;
