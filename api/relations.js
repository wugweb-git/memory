import { connectDB } from '../lib/db.js';
import { getAuthUser } from '../lib/auth.js';
import { sendError, fail } from '../lib/errors.js';
import Relation from '../models/Relation.js';

export default async function handler(req, res) {
  try {
    await connectDB();
    const user = await getAuthUser(req);
    if (!user) throw fail('unauthorized', 'auth_error', 401);

    if (req.method === 'GET') {
      const itemId = req.query?.item_id;
      if (!itemId) throw fail('item_id is required', 'validation_error', 400);
      const rows = await Relation.find({ $or: [{ source_item_id: itemId }, { target_item_id: itemId }] }).limit(100);
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const { source_item_id, target_item_id, type = 'related' } = req.body || {};
      if (!source_item_id || !target_item_id) throw fail('source_item_id and target_item_id required', 'validation_error', 400);
      const row = await Relation.findOneAndUpdate({ source_item_id, target_item_id, type }, { $set: { source_item_id, target_item_id, type } }, { upsert: true, new: true });
      return res.status(201).json(row);
    }

    throw fail('Method not allowed', 'validation_error', 405);
  } catch (error) {
    return sendError(res, error);
  }
}
