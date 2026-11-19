/** Pure helpers for Web Share (outgoing) and Web Share Target (incoming). */

export interface ShareContent {
  title?: string;
  text?: string;
  url?: string;
}

export function composeShareText(c: ShareContent): string {
  return [c.title?.trim(), c.text?.trim(), c.url?.trim()].filter(Boolean).join('\n');
}

/** Drops empty fields; navigator.share rejects objects with nothing in them. */
export function buildShareData(c: ShareContent): { title?: string; text?: string; url?: string } | null {
  const out: { title?: string; text?: string; url?: string } = {};
  if (c.title?.trim()) out.title = c.title.trim();
  if (c.text?.trim()) out.text = c.text.trim();
  if (c.url?.trim()) out.url = c.url.trim();
  return Object.keys(out).length ? out : null;
}

/* ---------------- Share target (incoming) ---------------- */

export const SHARE_TARGET_PATH = '/share-target';
export const SHARE_REVIEW_PATH = '/share-target/review';
export const SHARE_INBOX_CACHE = 'share-inbox-v1';
export const MAX_SHARED_TEXT = 20_000;
export const MAX_SHARED_TITLE = 300;
export const MAX_QUERY_TEXT = 1_500; // when carried in a URL (no service worker)
export const MAX_TEXT_FILE_BYTES = 200_000;

export interface SharedPayload {
  title: string;
  text: string;
  url: string | null;
}

const URL_RE = /https?:\/\/[^\s<>"')\]]+/i;

export function extractFirstUrl(s: string): string | null {
  const m = URL_RE.exec(s);
  return m ? m[0].replace(/[.,;:!?]+$/, '') : null;
}

function cleanUrl(raw: string | null | undefined): string | null {
  const v = raw?.trim();
  if (!v) return null;
  try {
    const u = new URL(v);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Android Chrome frequently puts the shared link inside `text` and leaves `url` empty,
 * so recover it. Only http(s) links are kept (no javascript:/data: via a hostile share).
 */
export function normalizeSharedFields(f: { title?: unknown; text?: unknown; url?: unknown }): SharedPayload {
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  let text = str(f.text).slice(0, MAX_SHARED_TEXT);
  const title = str(f.title).slice(0, MAX_SHARED_TITLE);
  let url = cleanUrl(str(f.url));
  if (!url) {
    const found = extractFirstUrl(text);
    url = cleanUrl(found);
    if (url && found) text = text.replace(found, '').trim();
  }
  return { title, text, url };
}

export function isEmptyShare(p: SharedPayload): boolean {
  return !p.title && !p.text && !p.url;
}

export function shareKind(p: SharedPayload): 'link' | 'note' {
  return p.url && !p.text ? 'link' : 'note';
}

/** Query string for the GET review page (used by the no-service-worker POST fallback). */
export function encodeReviewQuery(p: SharedPayload): string {
  const q = new URLSearchParams();
  if (p.title) q.set('title', p.title.slice(0, MAX_SHARED_TITLE));
  if (p.text) q.set('text', p.text.slice(0, MAX_QUERY_TEXT));
  if (p.url) q.set('url', p.url);
  return q.toString();
}

export function decodeReviewQuery(q: URLSearchParams): SharedPayload {
  return normalizeSharedFields({ title: q.get('title') ?? '', text: q.get('text') ?? '', url: q.get('url') ?? '' });
}

export type SharedFileKind = 'calendar' | 'text' | 'unsupported';

export function classifySharedFile(name: string, type: string): SharedFileKind {
  const n = name.toLowerCase();
  const t = type.toLowerCase();
  if (t === 'text/calendar' || n.endsWith('.ics')) return 'calendar';
  if (t === 'text/plain' || t === 'text/markdown' || n.endsWith('.txt') || n.endsWith('.md')) return 'text';
  return 'unsupported';
}

/** Body for POST /api/blob, the same intake the offline capture queue replays. */
export function buildShareCaptureBody(p: SharedPayload, now: Date = new Date()) {
  const kind = shareKind(p);
  const content = [p.text, p.url].filter(Boolean).join('\n');
  return {
    type: kind === 'link' ? 'shared_link' : 'shared_note',
    source: 'web_share_target',
    raw_payload: { content: content || p.title, title: p.title || null, url: p.url, text: p.text || null },
    trace_json: { origin: 'web_share_target', ingestion_path: 'buffer/share', received_at: now.toISOString() },
  };
}

export function buildSharedFileCaptureBody(file: { name: string; type: string; text: string }, now: Date = new Date()) {
  const kind = classifySharedFile(file.name, file.type);
  return {
    type: kind === 'calendar' ? 'shared_calendar_file' : 'shared_text_file',
    source: 'web_share_target',
    raw_payload: { content: file.text.slice(0, MAX_TEXT_FILE_BYTES), filename: file.name, mime: file.type || null },
    trace_json: { origin: 'web_share_target', ingestion_path: 'buffer/share-file', received_at: now.toISOString() },
  };
}
