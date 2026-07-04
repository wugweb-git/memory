/**
 * Real ingestion fetchers (L0) — dependency-free.
 * fetchUrl: guarded server-side fetch (http/https only, private ranges blocked,
 * timeout + size cap). extractArticle: HTML → readable title/text.
 * parseFeed: RSS 2.0 / Atom → items.
 */

const MAX_BYTES = 1_500_000;
const FETCH_TIMEOUT_MS = 10_000;

/** Server-side fetch with SSRF guards. Endpoints using this are owner-only. */
export async function fetchUrl(url: string, timeoutMs = FETCH_TIMEOUT_MS): Promise<string> {
  const u = new URL(url);
  if (!/^https?:$/.test(u.protocol)) {
    throw new Error('Only http(s) URLs can be ingested');
  }
  const host = u.hostname.toLowerCase();
  const isPrivate =
    host === 'localhost' ||
    host === '::1' ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host);
  if (isPrivate) {
    throw new Error('Refusing to fetch private/loopback address');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'IdentityPrism/1.0 (personal ingestion)',
        Accept: 'text/html,application/xhtml+xml,application/rss+xml,application/atom+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    if (!res.ok) throw new Error(`Fetch failed: HTTP ${res.status}`);
    const text = await res.text();
    return text.length > MAX_BYTES ? text.slice(0, MAX_BYTES) : text;
  } finally {
    clearTimeout(timer);
  }
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

/** Strip chrome and boilerplate; prefer <article>/<main>; return title + text. */
export function extractArticle(html: string): { title: string | null; text: string } {
  const title =
    html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i)?.[1]?.trim() ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i)?.[1]?.trim() ??
    html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ??
    null;

  const withoutChrome = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<(nav|header|footer|aside|form)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');

  const core =
    withoutChrome.match(/<article[\s>][\s\S]*?<\/article>/i)?.[0] ??
    withoutChrome.match(/<main[\s>][\s\S]*?<\/main>/i)?.[0] ??
    withoutChrome;

  const text = decodeEntities(
    core
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|h[1-6]|li|blockquote|tr|section)>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return { title: title ? decodeEntities(title) : null, text };
}

export type FeedItem = {
  title: string;
  url: string;
  summary?: string;
  publishedAt?: string;
};

/** Parse RSS 2.0 <item> and Atom <entry> blocks. Lightweight, best-effort. */
export function parseFeed(xml: string): FeedItem[] {
  const pick = (block: string, tag: string) =>
    block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'))?.[1]?.trim();
  const clean = (s?: string) =>
    s === undefined
      ? undefined
      : decodeEntities(
          s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, ' '),
        ).replace(/\s+/g, ' ').trim() || undefined;

  const items: FeedItem[] = [];

  for (const block of xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? []) {
    const url = clean(pick(block, 'link')) ?? block.match(/<link[^>]*href=["']([^"']+)/i)?.[1];
    if (!url) continue;
    items.push({
      title: clean(pick(block, 'title')) ?? 'Untitled',
      url,
      summary: clean(pick(block, 'description')),
      publishedAt: clean(pick(block, 'pubDate')),
    });
  }

  for (const block of xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) ?? []) {
    const url =
      block.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)/i)?.[1] ??
      block.match(/<link[^>]*href=["']([^"']+)/i)?.[1] ??
      clean(pick(block, 'link'));
    if (!url) continue;
    items.push({
      title: clean(pick(block, 'title')) ?? 'Untitled',
      url,
      summary: clean(pick(block, 'summary')) ?? clean(pick(block, 'content')),
      publishedAt: clean(pick(block, 'published')) ?? clean(pick(block, 'updated')),
    });
  }

  return items;
}
