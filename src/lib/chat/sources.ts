/**
 * Public-safe source citations for the visitor /ask chat. Pure helpers (no DB,
 * no network, no React) shared by the route and the page.
 *
 * Only a short label and the already-public packet_id ever leave the server:
 * never scores, full chunks, metadata or internal ids.
 */

export type AskSource = { label: string; packet_id: string };

/** Name of the response header carrying the base64url-encoded JSON source list. */
export const ASK_SOURCES_HEADER = 'X-Ask-Sources';
export const MAX_ASK_SOURCES = 4;
/** Cap on the header value length (characters, all ASCII after base64url). */
export const MAX_SOURCES_HEADER_CHARS = 2048;
const SNIPPET_CHARS = 80;
const SOURCE_NAME_CHARS = 40;
const PACKET_ID_MAX = 64;

/** Shape of a retrieval hit; extra fields (score, context chunks, ...) are ignored. */
export type RetrievalHitLike = {
  packet_id?: unknown;
  source?: unknown;
  title?: unknown;
  context?: unknown;
};

function collapse(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
}

function clip(text: string, max: number): string {
  const chars = Array.from(text);
  if (chars.length <= max) return text;
  return `${chars.slice(0, max).join('').trimEnd()}…`;
}

/** Short public label: "source: title-or-first-80-chars". Never the full chunk. */
export function buildSourceLabel(hit: RetrievalHitLike): string {
  const source = typeof hit.source === 'string' ? clip(collapse(hit.source), SOURCE_NAME_CHARS) : '';
  let detail = typeof hit.title === 'string' ? collapse(hit.title) : '';
  if (!detail && Array.isArray(hit.context) && typeof hit.context[0] === 'string') {
    detail = collapse(hit.context[0]);
  }
  detail = clip(detail, SNIPPET_CHARS);
  if (source && detail) return `${source}: ${detail}`;
  return source || detail || 'Public note';
}

/** De-duplicated (by packet_id), capped list built from public-only retrieval hits. */
export function buildAskSources(hits: unknown, max: number = MAX_ASK_SOURCES): AskSource[] {
  if (!Array.isArray(hits)) return [];
  const seen = new Set<string>();
  const out: AskSource[] = [];
  for (const raw of hits) {
    if (out.length >= max) break;
    if (!raw || typeof raw !== 'object') continue;
    const hit = raw as RetrievalHitLike;
    const id = typeof hit.packet_id === 'string' ? hit.packet_id : '';
    if (!id || id.length > PACKET_ID_MAX || seen.has(id)) continue;
    seen.add(id);
    out.push({ label: buildSourceLabel(hit), packet_id: id });
  }
  return out;
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): string {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/**
 * Encodes sources as base64url JSON. Drops sources from the end until the value
 * fits `maxChars`. Returns null (send NO header) when there is nothing to send.
 * Only label and packet_id are ever serialised.
 */
export function buildSourcesHeader(sources: readonly AskSource[], maxChars: number = MAX_SOURCES_HEADER_CHARS): string | null {
  const clean = (Array.isArray(sources) ? sources : [])
    .filter((s) => s && typeof s.label === 'string' && typeof s.packet_id === 'string' && s.packet_id)
    .map((s) => ({ label: s.label, packet_id: s.packet_id }));
  for (let n = clean.length; n > 0; n--) {
    const encoded = toBase64Url(JSON.stringify(clean.slice(0, n)));
    if (encoded.length <= maxChars) return encoded;
  }
  return null;
}

/** Decodes and validates a header value. Anything malformed yields []. */
export function parseSourcesHeader(value: string | null | undefined): AskSource[] {
  if (!value || value.length > MAX_SOURCES_HEADER_CHARS * 2) return [];
  try {
    const parsed: unknown = JSON.parse(fromBase64Url(value));
    if (!Array.isArray(parsed)) return [];
    const out: AskSource[] = [];
    for (const item of parsed) {
      if (out.length >= MAX_ASK_SOURCES) break;
      if (!item || typeof item !== 'object') continue;
      const { label, packet_id } = item as Record<string, unknown>;
      if (typeof label !== 'string' || typeof packet_id !== 'string' || !label || !packet_id) continue;
      out.push({ label: clip(collapse(label), SNIPPET_CHARS + SOURCE_NAME_CHARS + 2), packet_id });
    }
    return out;
  } catch {
    return [];
  }
}
