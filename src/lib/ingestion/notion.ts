import { Push_To_Blob, Promote_To_Memory } from '@/lib/blobLayer';

/**
 * Notion sync (L0) — token-based internal integration, no OAuth.
 *
 * Setup (owner, one time):
 *   1. notion.so/my-integrations → New integration (internal) → copy token.
 *   2. In Notion, open the page/database to sync → ⋯ → Connections → add
 *      the integration.
 *   3. Set NOTION_TOKEN in Vercel env (and .env.local).
 *
 * Sync strategy: Notion search API (sorted by last_edited_time) → for each
 * page, pull its blocks and flatten to text → one blob item per page,
 * deduped by page id + last_edited stamp. External-tagged, held for review.
 */

const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';
const MAX_PAGES = 15;
const MAX_BLOCKS_PER_PAGE = 200;

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json',
  };
}

function richTextToPlain(rt: any[]): string {
  return (rt ?? []).map((t) => t?.plain_text ?? '').join('');
}

function blockToText(block: any): string {
  const type = block?.type;
  const data = block?.[type];
  if (!data) return '';
  if (Array.isArray(data.rich_text)) {
    const text = richTextToPlain(data.rich_text);
    if (!text) return '';
    if (type === 'heading_1') return `# ${text}`;
    if (type === 'heading_2') return `## ${text}`;
    if (type === 'heading_3') return `### ${text}`;
    if (type === 'bulleted_list_item' || type === 'numbered_list_item') return `- ${text}`;
    if (type === 'to_do') return `- [${data.checked ? 'x' : ' '}] ${text}`;
    if (type === 'quote') return `> ${text}`;
    if (type === 'code') return `\`\`\`\n${text}\n\`\`\``;
    return text;
  }
  if (type === 'child_page') return `[Page] ${data.title ?? ''}`;
  return '';
}

async function notionFetch(token: string, path: string, init?: RequestInit) {
  const res = await fetch(`${NOTION_API}${path}`, { ...init, headers: headers(token) });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`Notion API ${res.status}: ${body?.message ?? res.statusText}`);
  }
  return res.json();
}

async function pageText(token: string, pageId: string): Promise<string> {
  const parts: string[] = [];
  let cursor: string | undefined;
  let fetched = 0;
  do {
    const qs = cursor ? `?start_cursor=${cursor}&page_size=100` : '?page_size=100';
    const data = await notionFetch(token, `/blocks/${pageId}/children${qs}`);
    for (const block of data.results ?? []) {
      const text = blockToText(block);
      if (text) parts.push(text);
      fetched++;
      if (fetched >= MAX_BLOCKS_PER_PAGE) return parts.join('\n');
    }
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return parts.join('\n');
}

function pageTitle(page: any): string {
  const props = page?.properties ?? {};
  for (const key of Object.keys(props)) {
    if (props[key]?.type === 'title') {
      const t = richTextToPlain(props[key].title);
      if (t) return t;
    }
  }
  return 'Untitled';
}

export async function ingestNotion(
  opts: { query?: string; autoPromote?: boolean; skipSeen?: string[] } = {},
) {
  const token = process.env.NOTION_TOKEN;
  if (!token) {
    throw new Error('NOTION_NOT_CONFIGURED: set NOTION_TOKEN (internal integration) and share pages with it');
  }

  // Cross-run dedup: sourceId = notion:<pageId>:<lastEdited>, so an unchanged
  // page is skipped and an edited page re-ingests as a new item.
  const seen = new Set(opts.skipSeen ?? []);

  // Most recently edited pages the integration can see.
  const search = await notionFetch(token, '/search', {
    method: 'POST',
    body: JSON.stringify({
      query: opts.query ?? '',
      filter: { property: 'object', value: 'page' },
      sort: { direction: 'descending', timestamp: 'last_edited_time' },
      page_size: MAX_PAGES,
    }),
  });

  const results: Array<{ page_id: string; source_id: string; title: string; blob_id?: string; skipped?: string; promoted: boolean }> = [];

  for (const page of search.results ?? []) {
    const title = pageTitle(page);
    const lastEdited = page.last_edited_time ?? '';
    const sourceId = `notion:${page.id}:${lastEdited}`;

    if (seen.has(sourceId)) {
      results.push({ page_id: page.id, source_id: sourceId, title, skipped: 'already_seen', promoted: false });
      continue;
    }

    let text = '';
    try {
      text = await pageText(token, page.id);
    } catch (err: any) {
      results.push({ page_id: page.id, source_id: sourceId, title, skipped: `blocks: ${err.message}`, promoted: false });
      continue;
    }
    if (!text || text.trim().length < 20) {
      results.push({ page_id: page.id, source_id: sourceId, title, skipped: 'no_extractable_text', promoted: false });
      continue;
    }

    const item = await Push_To_Blob({
      type: 'notion_page',
      source: 'notion',
      source_id: sourceId,
      raw_payload: {
        title,
        content: text.slice(0, 50_000),
        url: page.url ?? null,
        last_edited: lastEdited,
      },
      trace_json: {
        origin: 'notion',
        input_mode: 'synced',
        declared_author: 'self',
        ingestion_path: 'ingest/notion',
        page_id: page.id,
        received_at: new Date().toISOString(),
      },
    });

    let promoted = false;
    if (opts.autoPromote) {
      await Promote_To_Memory(item.id);
      promoted = true;
    }
    results.push({ page_id: page.id, source_id: sourceId, title, blob_id: item.id, promoted });
  }

  return {
    source: 'notion',
    accepted: true,
    scanned: (search.results ?? []).length,
    ingested: results.filter((r) => r.blob_id).length,
    items: results,
  };
}
