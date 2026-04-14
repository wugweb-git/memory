import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema(
  {
    // CORE DATA (RAG + Vector)
    text: { type: String, required: true },
    text_embedding: { type: [Number], select: false }, // Avoid fetching embeddings by default
    
    // SIGNAL METADATA
    sourceType: { type: String, required: true, index: true },
    sourceOrigin: { type: String, index: true },
    profileId: { type: String, default: 'system', index: true },
    isPublic: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now, index: true },
    
    // CHUNKING LOGIC
    chunkIndex: { type: Number, default: 0 },
    totalChunks: { type: Number, default: 1 },
    
    // STRUCTURED REFERENCES
    sourceUrl: { type: String, index: true },
    external_id: { type: String, index: true },
    
    // INTELLIGENCE & CLASSIFICATION
    industry_tag: [String],
    spirit_note: String,
    concepts: [String],
    
    // LEGACY COMPATIBILITY
    content_type: { type: String, enum: ['text', 'link', 'file'], default: 'text' }
  },
  { 
    collection: 'training_data', 
    timestamps: true,
    strict: false // Allow dynamic metadata from ingestion pipelines
  }
);

itemSchema.index({ sourceType: 1, timestamp: -1 });
itemSchema.index({ profileId: 1, timestamp: -1 });

export default mongoose.models.Item || mongoose.model('Item', itemSchema);
