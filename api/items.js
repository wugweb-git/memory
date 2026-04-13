import mongoose from 'mongoose';
import connectToDatabase from '../lib/mongodb.js';

const ItemSchema = new mongoose.Schema(
  {
    content: {
      raw: { type: String, required: true },
      type: { type: String, default: 'text' }
    },
    source: {
      type: { type: String, default: 'manual' }
    },
    origin: {
      created_at: { type: Date, default: Date.now },
      created_by: { type: String, default: 'user' }
    },
    sync: {
      link_status: { type: String, default: 'active' },
      has_changed: { type: Boolean, default: false }
    }
  },
  {
    collection: 'items',
    strict: false
  }
);

const Item = mongoose.models.Item || mongoose.model('Item', ItemSchema);

export default async function handler(req, res) {
  await connectToDatabase();

  if (req.method === 'POST') {
    const { raw } = req.body || {};

    if (!raw) {
      return res.status(400).json({ error: 'raw is required' });
    }

    const item = await Item.create({
      content: { raw, type: 'text' },
      source: { type: 'manual' },
      origin: { created_at: new Date(), created_by: 'user' },
      sync: { link_status: 'active', has_changed: false }
    });

    return res.status(201).json(item);
  }

  if (req.method === 'GET') {
    const items = await Item.find().sort({ 'origin.created_at': -1 }).limit(50);
    return res.status(200).json(items);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
