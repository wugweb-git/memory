import { MemoryService } from '@/lib/memory/service';
import { parseCsv } from './csv';

/**
 * Bulk-import a blog / case-study CSV export into memory — one memory packet
 * per row. Columns are matched case-insensitively (tolerant of Webflow/Framer/
 * WordPress-style headers). MemoryService.ingest handles gating + hash dedup,
 * so re-imports are safe. Packets land with embedding_status = pending; they
 * become searchable once an embeddings provider (OPENROUTER_API_KEY) is set.
 */

export interface CsvImportSummary {
  total: number;
  imported: number;
  duplicates: number;
  skipped: number;
  failed: number;
  items: Array<{ title: string; status: string; reason?: string }>;
}

/** First non-empty value among the given header names (case-insensitive). */
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
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;|&rsquo;|&lsquo;/gi, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

export async function importBlogCsv(
  csvText: string,
  userId: string,
  opts: { type?: string } = {},
): Promise<CsvImportSummary> {
  const rows = parseCsv(csvText);
  const type = opts.type || 'blog';
  const summary: CsvImportSummary = { total: rows.length, imported: 0, duplicates: 0, skipped: 0, failed: 0, items: [] };

  for (const row of rows) {
    const title = pick(row, 'Title', 'name');
    const subtitle = pick(row, 'Subtitle', 'Excerpt', 'SEO Description');
    const body = stripHtml(pick(row, 'Content', 'body', 'html', 'text'));

    if (!title && !body) {
      summary.skipped++;
      summary.items.push({ title: title || '(untitled)', status: 'skipped', reason: 'no title or content' });
      continue;
    }

    const slug = pick(row, 'Slug', 'url', 'link') || slugify(title);
    const content = [title && `# ${title}`, subtitle, body].filter(Boolean).join('\n\n');

    try {
      const res = await MemoryService.ingest(
        {
          source: 'csv_import',
          source_id: `${type}:${slug}`,
          type,
          content,
          metadata: {
            title,
            subtitle,
            slug,
            url: pick(row, 'url', 'link'),
            author: pick(row, 'Author'),
            publish_date: pick(row, 'Publish Date', 'date'),
            tags: pick(row, 'Tags'),
            category: pick(row, 'Primary Category', 'Category Label', 'Filter Category'),
            read_time: pick(row, 'Read Time'),
            excerpt: pick(row, 'Excerpt'),
            seo_title: pick(row, 'SEO Title'),
            seo_description: pick(row, 'SEO Description'),
            thumbnail: pick(row, 'Thumbnail Image'),
            ingestion_path: 'api/ingest/csv',
          },
          trace: { origin: 'csv_import', ingestion_path: ['browser', 'api/ingest/csv', 'MemoryService'] },
        },
        userId,
      );

      if (res.status === 'ACCEPTED') {
        summary.imported++;
        summary.items.push({ title: title || slug, status: 'imported' });
      } else if (res.reason === 'DUPLICATE_HASH' || res.status === 'IGNORE') {
        summary.duplicates++;
        summary.items.push({ title: title || slug, status: 'duplicate' });
      } else {
        summary.skipped++;
        summary.items.push({ title: title || slug, status: String(res.status ?? 'skipped').toLowerCase(), reason: res.reason });
      }
    } catch (e: any) {
      summary.failed++;
      summary.items.push({ title: title || slug, status: 'failed', reason: e?.message });
    }
  }

  return summary;
}
