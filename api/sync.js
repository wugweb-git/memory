import { syncItem } from '../lib/sync.js';
import { sendError } from '../lib/errors.js';

export default async function handler(req, res) {
  try {
    const result = await syncItem(req);
    return res.status(result.code).json(result.body);
  } catch (error) {
    return sendError(res, error);
  }
}
