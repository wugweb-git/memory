/**
 * Minimal dependency-free ZIP reader (central directory + stored/deflate) with
 * zip-bomb guards. Enough for LinkedIn / X data-export archives.
 */
import { inflateRawSync } from 'node:zlib';

export const ZIP_LIMITS = { maxEntries: 5000, maxEntryBytes: 50 * 1024 * 1024, maxTotalBytes: 150 * 1024 * 1024 };

export function isZip(buf: Buffer): boolean {
  return buf.length > 4 && buf.readUInt32LE(0) === 0x04034b50;
}

export function readZip(buf: Buffer, only?: (name: string) => boolean): Map<string, Buffer> {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 65535); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Not a valid zip archive');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  if (count > ZIP_LIMITS.maxEntries) throw new Error('Archive has too many files');
  const out = new Map<string, Buffer>();
  let total = 0;
  for (let n = 0; n < count; n++) {
    if (p + 46 > buf.length || buf.readUInt32LE(p) !== 0x02014b50) throw new Error('Corrupt zip directory');
    const method = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20);
    const usize = buf.readUInt32LE(p + 24);
    const nlen = buf.readUInt16LE(p + 28);
    const xlen = buf.readUInt16LE(p + 30);
    const clen = buf.readUInt16LE(p + 32);
    const lho = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nlen);
    p += 46 + nlen + xlen + clen;
    if (name.endsWith('/') || name.includes('..') || (only && !only(name))) continue;
    if (usize > ZIP_LIMITS.maxEntryBytes) continue;
    total += usize;
    if (total > ZIP_LIMITS.maxTotalBytes) throw new Error('Archive too large when extracted');
    const lnlen = buf.readUInt16LE(lho + 26);
    const lxlen = buf.readUInt16LE(lho + 28);
    const start = lho + 30 + lnlen + lxlen;
    const data = buf.subarray(start, start + csize);
    if (method === 0) out.set(name, Buffer.from(data));
    else if (method === 8) out.set(name, inflateRawSync(data, { maxOutputLength: ZIP_LIMITS.maxEntryBytes }));
  }
  return out;
}
