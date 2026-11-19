/**
 * Real ingestion fetchers (L0) — dependency-free.
 * fetchUrl: guarded server-side fetch (http/https only, private ranges blocked,
 * timeout + size cap). extractArticle: HTML → readable title/text.
 * parseFeed: RSS 2.0 / Atom → items.
 */

import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const MAX_BYTES = 1_500_000;
const FETCH_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 5;

/** True for loopback / private / link-local / unspecified / multicast addresses. */
export function isPrivateAddress(ip: string): boolean {
  let addr = ip.toLowerCase().replace(/^\[|\]$/g, '');
  // IPv4-mapped IPv6 (::ffff:a.b.c.d or ::ffff:abcd:ef01) → unwrap.
  const mapped = addr.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) addr = mapped[1];
  const mappedHex = addr.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (mappedHex) {
    const hi = parseInt(mappedHex[1], 16);
    const lo = parseInt(mappedHex[2], 16);
    addr = `${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`;
  }

  const kind = isIP(addr);
  if (kind === 4) {
    const [a, b] = addr.split('.').map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      a >= 224 || // multicast + reserved + broadcast
      (a === 100 && b >= 64 && b <= 127) || // CGNAT
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19))
    );
  }
  if (kind === 6) {
    return (
      addr === '::' ||
      addr === '::1' ||
      /^f[cd][0-9a-f]{2}:/.test(addr) || // fc00::/7 unique-local
      /^fe[89ab][0-9a-f]:/.test(addr) || // fe80::/10 link-local
      /^ff[0-9a-f]{2}:/.test(addr) // multicast
    );
  }
  return true; // not a valid IP literal → treat as unsafe
}

async function assertPublicHost(hostname: string): Promise<void> {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal')
  ) {
    throw new Error('Refusing to fetch private/loopback address');
  }
  if (isIP(host)) {
    if (isPrivateAddress(host)) throw new Error('Refusing to fetch private/loopback address');
    return;
  }
  // Resolve and check EVERY returned address (blocks DNS names that point inside).
  let addrs: Array<{ address: string }>;
  try {
    addrs = await lookup(host, { all: true });
  } catch {
    throw new Error(`Could not resolve host: ${host}`);
  }
  if (!addrs.length || addrs.some((a) => isPrivateAddress(a.address))) {
    throw new Error('Refusing to fetch private/loopback address');
  }
}

async function readCapped(res: Response): Promise<string> {
  if (!res.body) {
    const t = await res.text();
    return t.length > MAX_BYTES ? t.slice(0, MAX_BYTES) : t;
  }
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.byteLength;
  }
  try {
    await reader.cancel();
  } catch {
    /* already closed */
  }
  return new TextDecoder().decode(Buffer.concat(chunks)).slice(0, MAX_BYTES);
}

/**
 * Server-side fetch with SSRF guards: http(s) only, hostnames resolved and every
 * address checked against private/loopback/link-local ranges, redirects followed
 * manually (each hop re-validated, max 5), hard timeout and streaming size cap.
 * Endpoints using this are owner-only. Residual risk: DNS rebinding between the
 * lookup and the connect (mitigated, not eliminated — use an egress proxy if the
 * deployment ever becomes multi-tenant).
 */
export async function fetchUrl(url: string, timeoutMs = FETCH_TIMEOUT_MS): Promise<string> {
  let current = new URL(url);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      if (!/^https?:$/.test(current.protocol)) {
        throw new Error('Only http(s) URLs can be ingested');
      }
      if (current.username || current.password) {
        throw new Error('URLs with embedded credentials are not allowed');
      }
      await assertPublicHost(current.hostname);

      const res = await fetch(current.toString(), {
        signal: controller.signal,
        redirect: 'manual',
        headers: {
          'User-Agent': 'IdentityPrism/1.0 (personal ingestion)',
          Accept: 'text/html,application/xhtml+xml,application/rss+xml,application/atom+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get('location');
        if (!loc) throw new Error(`Fetch failed: HTTP ${res.status} without Location`);
        current = new URL(loc, current);
        continue;
      }
      if (!res.ok) throw new Error(`Fetch failed: HTTP ${res.status}`);
      return await readCapped(res);
    }
    throw new Error('Too many redirects');
  } catch (err: any) {
    if (err?.name === 'AbortError') throw new Error(`Fetch timed out after ${timeoutMs}ms`);
    throw err;
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
