import { getDownloadUrl, put } from '@vercel/blob';
import { fail } from './errors.js';

function getBlobToken() {
  const token = process.env.BLOB_READ_WRITE_TOKEN || '';
  if (!token) {
    throw fail('BLOB_READ_WRITE_TOKEN is required', 'validation_error', 500);
  }
  return token;
}

function sanitizeFilename(filename) {
  return String(filename || 'upload.bin').replace(/[^a-zA-Z0-9._-]/g, '_');
}

async function readRequestBody(req) {
  if (req.body && (Buffer.isBuffer(req.body) || typeof req.body === 'string' || req.body instanceof Uint8Array)) {
    return req.body;
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

export async function uploadPrivateBlob(req) {
  const parsed = new URL(req.originalUrl || req.url || '', 'http://localhost');
  const filename = sanitizeFilename(parsed.searchParams.get('filename') || 'upload.bin');
  const body = await readRequestBody(req);
  if (!body || body.length === 0) throw fail('File body is required', 'validation_error', 400);

  const blob = await put(filename, body, {
    access: 'private',
    token: getBlobToken()
  });
  return blob;
}

export async function fetchPrivateBlob(pathname) {
  if (!pathname) throw fail('Missing pathname', 'validation_error', 400);
  const downloadUrl = await getDownloadUrl(pathname, {
    token: getBlobToken()
  });
  return { downloadUrl };
}
