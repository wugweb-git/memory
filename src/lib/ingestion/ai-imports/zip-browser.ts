/**
 * Minimal zip reader for the browser (and Node 18+): reads the central
 * directory from the end of the Blob, then inflates only the entries asked for
 * with the platform DecompressionStream. No dependency. Large exports (hundreds
 * of MB of images) are never loaded whole. Handles zip64 and stored/deflate.
 */

export interface ZipEntry {
  name: string;
  method: number;
  compressedSize: number;
  size: number;
  offset: number;
}

const u16 = (v: DataView, o: number) => v.getUint16(o, true);
const u32 = (v: DataView, o: number) => v.getUint32(o, true);
const u64 = (v: DataView, o: number) => Number(v.getBigUint64(o, true));

async function bytes(blob: Blob, start: number, end: number): Promise<DataView> {
  const buf = await blob.slice(start, end).arrayBuffer();
  return new DataView(buf);
}

export async function listZip(blob: Blob): Promise<ZipEntry[]> {
  const tailLen = Math.min(blob.size, 65536 + 22 + 20 + 56);
  const tailStart = blob.size - tailLen;
  const tail = await bytes(blob, tailStart, blob.size);
  let eocd = -1;
  for (let i = tail.byteLength - 22; i >= 0; i--) {
    if (u32(tail, i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('This is not a readable zip file.');
  let total = u16(tail, eocd + 10);
  let cdSize = u32(tail, eocd + 12);
  let cdOffset = u32(tail, eocd + 16);
  if (cdOffset === 0xffffffff || cdSize === 0xffffffff || total === 0xffff) {
    const loc = eocd - 20;
    if (loc < 0 || u32(tail, loc) !== 0x07064b50) throw new Error('This zip64 archive could not be read. Unzip it and upload conversations.json instead.');
    const z64Offset = u64(tail, loc + 8);
    const z = await bytes(blob, z64Offset, z64Offset + 56);
    if (u32(z, 0) !== 0x06064b50) throw new Error('This zip64 archive could not be read. Unzip it and upload conversations.json instead.');
    total = u64(z, 32);
    cdSize = u64(z, 40);
    cdOffset = u64(z, 48);
  }
  const cd = await bytes(blob, cdOffset, cdOffset + cdSize);
  const dec = new TextDecoder();
  const out: ZipEntry[] = [];
  let p = 0;
  for (let n = 0; n < total && p + 46 <= cd.byteLength; n++) {
    if (u32(cd, p) !== 0x02014b50) break;
    const method = u16(cd, p + 10);
    let compressedSize = u32(cd, p + 20);
    let size = u32(cd, p + 24);
    const nameLen = u16(cd, p + 28);
    const extraLen = u16(cd, p + 30);
    const commentLen = u16(cd, p + 32);
    let offset = u32(cd, p + 42);
    const name = dec.decode(new Uint8Array(cd.buffer, cd.byteOffset + p + 46, nameLen));
    // zip64 extended info: only the fields that are 0xFFFFFFFF appear, in this order.
    let e = p + 46 + nameLen;
    const eEnd = e + extraLen;
    while (e + 4 <= eEnd) {
      const id = u16(cd, e);
      const len = u16(cd, e + 2);
      if (id === 0x0001) {
        let q = e + 4;
        if (size === 0xffffffff) { size = u64(cd, q); q += 8; }
        if (compressedSize === 0xffffffff) { compressedSize = u64(cd, q); q += 8; }
        if (offset === 0xffffffff) { offset = u64(cd, q); }
      }
      e += 4 + len;
    }
    out.push({ name, method, compressedSize, size, offset });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

export async function readZipEntry(blob: Blob, entry: ZipEntry): Promise<Uint8Array> {
  const head = await bytes(blob, entry.offset, entry.offset + 30);
  if (u32(head, 0) !== 0x04034b50) throw new Error(`Bad zip entry: ${entry.name}`);
  const dataStart = entry.offset + 30 + u16(head, 26) + u16(head, 28);
  const raw = blob.slice(dataStart, dataStart + entry.compressedSize);
  if (entry.method === 0) return new Uint8Array(await raw.arrayBuffer());
  if (entry.method !== 8) throw new Error(`Unsupported zip compression in ${entry.name}.`);
  const stream = raw.stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export const MAX_JSON_BYTES = 300 * 1024 * 1024;

/** Reads every zip entry whose path matches, as text. Entries over the size cap are refused. */
export async function readZipTexts(blob: Blob, match: (name: string) => boolean): Promise<Array<{ name: string; text: string }>> {
  const entries = (await listZip(blob)).filter((e) => !e.name.endsWith('/') && match(e.name));
  const out: Array<{ name: string; text: string }> = [];
  for (const e of entries) {
    if (e.size > MAX_JSON_BYTES) throw new Error(`${e.name} is larger than ${MAX_JSON_BYTES / 1024 / 1024} MB, which is too big to read in the browser.`);
    out.push({ name: e.name, text: new TextDecoder().decode(await readZipEntry(blob, e)) });
  }
  return out;
}

/** Entry names worth reading for each source. */
export const ZIP_MATCHERS = {
  chatgpt: (n: string) => /(^|\/)conversations(-\d+)?\.json$/i.test(n),
  claude: (n: string) => /(^|\/)conversations\.json$/i.test(n),
  gemini: (n: string) => /gemini/i.test(n) && /(^|\/)My ?Activity\.json$/i.test(n),
} as const;
