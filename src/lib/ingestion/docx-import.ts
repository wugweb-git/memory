import mammoth from 'mammoth';
import { MemoryService } from '@/lib/memory/service';
import type { CsvImportSummary } from './csv-import';

/**
 * Import a case-study .docx into memory — one packet per "Case Study N:" block.
 * mammoth extracts raw text (one line per Word paragraph); we split on the
 * heading, parse the "Field: value" header block into metadata, and ingest the
 * narrative. MemoryService.ingest gates + hash-dedups, so re-imports are safe.
 * Falls back to a single packet if no "Case Study N:" headings are present.
 */

const HEADING = /^\s*Case Study\s+\d+\s*[:\-–—]\s*(.+)$/i;
const FIELD = /^\s*(Subtitle|Category|Tags|Partner|Client|Industry|Disciplines|Team)\s*:\s*(.+)$/i;

export async function extractDocxText(buffer: Buffer): Promise<string> {
  const { value } = await mammoth.extractRawText({ buffer });
  return value;
}

export interface CaseStudyChunk {
  title: string;
  meta: Record<string, string>;
  body: string;
}

/** Split raw docx text into per-case-study chunks on the heading line. */
export function splitCaseStudies(text: string): CaseStudyChunk[] {
  const lines = text.split('\n');
  const raw: Array<{ title: string; lines: string[] }> = [];
  let current: { title: string; lines: string[] } | null = null;

  for (const line of lines) {
    const m = line.match(HEADING);
    if (m) {
      if (current) raw.push(current);
      current = { title: m[1].trim(), lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
    // Lines before the first heading (doc intro/title page) are ignored.
  }
  if (current) raw.push(current);

  return raw.map((c) => parseChunk(c.title, c.lines));
}

/** Pull the leading "Field: value" header block off; the rest is the body. */
function parseChunk(title: string, lines: string[]): CaseStudyChunk {
  const meta: Record<string, string> = {};
  let i = 0;
  for (; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') continue; // tolerate blank lines within the header
    const m = line.match(FIELD);
    if (m) meta[m[1].toLowerCase()] = m[2].trim();
    else break; // first non-field, non-blank line → body starts here
  }
  const body = lines.slice(i).join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return { title, meta, body };
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

async function ingestChunk(
  cs: CaseStudyChunk,
  userId: string,
  type: string,
  summary: CsvImportSummary,
) {
  if (!cs.title && !cs.body) {
    summary.skipped++;
    summary.items.push({ title: '(untitled)', status: 'skipped', reason: 'empty' });
    return;
  }
  const slug = slugify(cs.title);
  const content = [cs.title && `# ${cs.title}`, cs.meta.subtitle, cs.body].filter(Boolean).join('\n\n');

  try {
    const res = await MemoryService.ingest(
      {
        source: 'docx_import',
        source_id: `${type}:${slug}`,
        type,
        content,
        metadata: { title: cs.title, ...cs.meta, ingestion_path: 'api/ingest/docx' },
        trace: { origin: 'docx_import', ingestion_path: ['browser', 'api/ingest/docx', 'MemoryService'] },
      },
      userId,
    );

    if (res.status === 'ACCEPTED') {
      summary.imported++;
      summary.items.push({ title: cs.title, status: 'imported' });
    } else if (res.reason === 'DUPLICATE_HASH' || res.status === 'IGNORE') {
      summary.duplicates++;
      summary.items.push({ title: cs.title, status: 'duplicate' });
    } else {
      summary.skipped++;
      summary.items.push({ title: cs.title, status: String(res.status ?? 'skipped').toLowerCase(), reason: res.reason });
    }
  } catch (e: any) {
    summary.failed++;
    summary.items.push({ title: cs.title, status: 'failed', reason: e?.message });
  }
}

/**
 * Import a .docx into memory.
 *  - type 'case_study': split on "Case Study N:" → one packet per study
 *    (falls back to a single packet if no headings are found).
 *  - any other type (e.g. 'profile'): the whole document → one packet of that
 *    type, titled from its first line.
 */
export async function importDocx(
  buffer: Buffer,
  userId: string,
  opts: { type?: string; fileName?: string } = {},
): Promise<CsvImportSummary> {
  const type = opts.type || 'case_study';
  const fileName = (opts.fileName || 'document').replace(/\.docx$/i, '');
  const text = await extractDocxText(buffer);

  let chunks: CaseStudyChunk[];
  if (type === 'case_study') {
    chunks = splitCaseStudies(text);
    if (chunks.length === 0 && text.trim()) {
      chunks = [{ title: fileName, meta: {}, body: text.trim() }];
    }
  } else {
    const firstLine = text.split('\n').map((l) => l.trim()).find(Boolean) || fileName;
    chunks = [{ title: firstLine, meta: {}, body: text.trim() }];
  }

  const summary: CsvImportSummary = { total: chunks.length, imported: 0, duplicates: 0, skipped: 0, failed: 0, items: [] };
  for (const cs of chunks) {
    await ingestChunk(cs, userId, type, summary);
  }
  return summary;
}
