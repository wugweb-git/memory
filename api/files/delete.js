import fs from 'fs/promises';
import { connectDB } from '../../lib/db.js';
import { getAuthUser } from '../../lib/auth.js';
import { fail, sendError } from '../../lib/errors.js';
import FileMeta from '../../models/File.js';

export default async function handler(req, res) {
  try {
    await connectDB();
    const user = await getAuthUser(req);
    if (!user) throw fail('unauthorized', 'auth_error', 401);
    if (req.method !== 'POST') throw fail('Method not allowed', 'validation_error', 405);

    const { file_id } = req.body || {};
    if (!file_id) throw fail('file_id is required', 'validation_error', 400);

    const file = await FileMeta.findById(file_id);
    if (!file) throw fail('file not found', 'validation_error', 404);
    if (user.role !== 'admin' && file.user_id !== String(user._id)) throw fail('forbidden', 'auth_error', 403);

    if (!file.deleted_at) {
      await fs.unlink(file.storage_path).catch(() => {});
      file.deleted_at = new Date();
      await file.save();
    }

    return res.status(200).json({ ok: true, file_id });
  } catch (error) {
    return sendError(res, error);
  }
}
