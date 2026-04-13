import fs from 'fs/promises';
import path from 'path';
import multer from 'multer';
import { connectDB } from '../lib/db.js';
import { getAuthUser } from '../lib/auth.js';
import { config } from '../config/config.js';
import { fail, sendError } from '../lib/errors.js';
import { writeLog } from '../lib/log.js';
import FileMeta from '../models/File.js';
import Item from '../models/Item.js';
import { hashRaw } from '../lib/hash.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

function runUpload(req, res) {
  return new Promise((resolve, reject) => {
    upload.single('file')(req, res, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export default async function handler(req, res) {
  try {
    await connectDB();
    const user = await getAuthUser(req);
    if (!user) throw fail('unauthorized', 'auth_error', 401);
    if (req.method !== 'POST') throw fail('Method not allowed', 'validation_error', 405);

    await runUpload(req, res);
    if (!req.file) throw fail('file is required', 'validation_error', 400);

    const dir = path.join(config.uploadDir, String(user._id));
    await fs.mkdir(dir, { recursive: true });
    const safeName = `${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const fullPath = path.join(dir, safeName);
    await fs.writeFile(fullPath, req.file.buffer);

    const publicUrl = `/uploads/${user._id}/${safeName}`;
    const meta = await FileMeta.create({
      user_id: String(user._id),
      original_name: req.file.originalname,
      mime_type: req.file.mimetype,
      size: req.file.size,
      storage_path: fullPath,
      public_url: publicUrl
    });

    const item = await Item.create({
      content: { raw: req.file.originalname, type: 'file' },
      source: { type: 'manual', url: publicUrl },
      owner: { user_id: String(user._id), email: user.email },
      visibility: 'private',
      origin: { created_at: new Date(), created_by: 'user' },
      sync: { last_synced_at: new Date(), has_changed: false, link_status: 'active', error_reason: '' },
      versioning: { current_hash: hashRaw(req.file.originalname), previous_versions: [] }
    });

    await writeLog({ action: 'upload.file', user_id: String(user._id), path: req.url, response: { file_id: String(meta._id), item_id: String(item._id) } });
    return res.status(201).json({ file: meta, item });
  } catch (error) {
    return sendError(res, error);
  }
}
