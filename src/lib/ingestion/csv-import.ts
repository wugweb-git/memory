import { MemoryService } from '@/lib/memory/service';
import { parseCsv } from './csv';

/**
 * Generic CSV → memory bulk import (one packet per row). Works for any export
 * shape (blog posts, case studies, client lists…): it finds a title column,
 * uses a body/content column if present (else renders all fields), and keeps
 * every column as metadata. `type` labels the packets. MemoryService.ingest
 * gates + hash-dedups, so re-imports are safe.
 */

export interface CsvImportSummary {
  total: number;
  imported: number;
  duplicates: number;
  skipped: number;
  failed: number;
  items: Array<{ title: string; status: string; reason?: string }>;
}

// Priority order for the "title" of a row, across common export shapes.
const TITLE_COLS = ['Title', 'Brand Name', 'Name', 'Client', 'Company', 'Client ID', 'Slug', 'SEO Title'];
const BODY_COLS = ['Content', 'body', 'html', 'text', 'description'];
const SUBTITLE_COLS = ['Subtitle', 'Excerpt', 'Headline', 'Profile Title', 'Tagline'];
const SLUG_COLS = ['Slug', 'url', 'link'];

function pick(row: Record<string, string>, ...names: string[]): string {
  const keys = Object.keys(row);
  for (const n of names) {
    const key = keys.find((k) => k.toLowerCase() === n.toLowerCase());
    if (key && row[key]?.trim()) return row[key].trim();
  }
  return '';
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
    .replace(/&#39;|&rsquo;|&lsquo;/gi, "'").replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

const isBodyCol = (key: string) => BODY_COLS.some((b) => b.toLowerCase() === key.toLowerCase());

/** Human-readable "Key: value" rendering of a row (used when there's no body column). */
function renderFields(row: Record<string, string>): string {
  return Object.entries(row)
    .filter(([, v]) => v && v.trim() && v.trim() !== '—')
    .map(([k, v]) => `${k}: ${v.trim()}`)
    .join('\n');
}

export async function importCsv(
  csvText: string,
  userId: string,
  opts: { type?: string } = {},
): Promise<CsvImportSummary> {
  const rows = parseCsv(csvText);
  const type = opts.type || 'record';
  const summary: CsvImportSummary = { total: rows.length, imported: 0, duplicates: 0, skipped: 0, failed: 0, items: [] };

  for (const row of rows) {
    const title = pick(row, ...TITLE_COLS) || Object.values(row).find((v) => v?.trim())?.trim() || '';
    const bodyRaw = pick(row, ...BODY_COLS);
    const body = bodyRaw ? stripHtml(bodyRaw) : renderFields(row);

    if (!title && !body) {
      summary.skipped++;
      summary.items.push({ title: '(untitled)', status: 'skipped', reason: 'empty row' });
      continue;
    }

    const slug = pick(row, ...SLUG_COLS) || slugify(title);
    const subtitle = pick(row, ...SUBTITLE_COLS);
    const content = [title && `# ${title}`, subtitle, body].filter(Boolean).join('\n\n');

    // All columns → metadata (skip the big body column to avoid duplication/bloat).
    const metadata: Record<string, any> = { title, slug, record_type: type, ingestion_path: 'api/ingest/csv' };
    for (const [k, v] of Object.entries(row)) {
      if (v && v.trim() && !isBodyCol(k)) {
        metadata[k.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')] = v.trim();
      }
    }

    try {
      const res = await MemoryService.ingest(
        {
          source: 'csv_import',
          source_id: `${type}:${slug}`,
          type,
          content,
          metadata,
          trace: { origin: 'csv_import', ingestion_path: ['browser', 'api/ingest/csv', 'MemoryService'] },
        },
        userId,
      );

      if (res.status === 'ACCEPTED') {
        summary.imported++;
        summary.items.push({ title, status: 'imported' });
      } else if (res.reason === 'DUPLICATE_HASH' || res.status === 'IGNORE') {
        summary.duplicates++;
        summary.items.push({ title, status: 'duplicate' });
      } else {
        summary.skipped++;
        summary.items.push({ title, status: String(res.status ?? 'skipped').toLowerCase(), reason: res.reason });
      }
    } catch (e: any) {
      summary.failed++;
      summary.items.push({ title, status: 'failed', reason: e?.message });
    }
  }

  return summary;
}
