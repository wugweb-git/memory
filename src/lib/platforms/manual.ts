/**
 * Platforms with no publishing API (or none we can use): the app prepares the
 * text and the owner posts it by hand. Pure module, safe for client and server.
 */

export const MANUAL_PLATFORMS = {
  substack: { label: 'Substack', openLabel: 'Open Substack', url: 'https://substack.com/home' },
  behance: { label: 'Behance', openLabel: 'Open Behance', url: 'https://www.behance.net/portfolio/editor' },
  dribbble: { label: 'Dribbble', openLabel: 'Open Dribbble', url: 'https://dribbble.com/shots/new' },
} as const;

export type ManualPlatform = keyof typeof MANUAL_PLATFORMS;

export function isManualPlatform(platform: unknown): platform is ManualPlatform {
  return typeof platform === 'string' && Object.prototype.hasOwnProperty.call(MANUAL_PLATFORMS, platform);
}

const MAX_TITLE = 100;

/** Title from the caller, else the first non-empty line (heading marks stripped). Remaining text is the body. */
function splitTitle(content: string, title?: string): { title: string; body: string } {
  const given = (title ?? '').trim();
  if (given) return { title: given, body: content.trim() };
  const lines = content.trim().split('\n');
  const first = (lines.shift() ?? '').replace(/^#+\s*/, '').trim();
  const rest = lines.join('\n').trim();
  if (!first) return { title: 'Untitled', body: content.trim() };
  if (first.length > MAX_TITLE) return { title: 'Untitled', body: content.trim() };
  return { title: first, body: rest || content.trim() };
}

function cleanTags(tags: string[] = []): string[] {
  return tags.map((t) => String(t).replace(/^#/, '').trim()).filter(Boolean).slice(0, 10);
}

/** Substack: title plus a markdown body. */
export function buildSubstackPayload(params: { content: string; title?: string }) {
  const { title, body } = splitTitle(params.content, params.title);
  return { platform: 'substack', payload: { title, content: body } };
}

/** Behance and Dribbble: title, description and tags. */
export function buildDesignPortfolioPayload(platform: 'behance' | 'dribbble', params: { content: string; title?: string; tags?: string[] }) {
  const { title, body } = splitTitle(params.content, params.title);
  return { platform, payload: { title, description: body, tags: cleanTags(params.tags) } };
}

/** The plain text the owner copies, built from the router payload (wrapped or bare). */
export function manualPostText(platform: string, payload: unknown): string {
  const inner =
    payload && typeof payload === 'object' && 'payload' in (payload as object)
      ? (payload as { payload: unknown }).payload
      : payload;
  if (typeof inner === 'string') return inner;
  if (!inner || typeof inner !== 'object') return '';
  const p = inner as { title?: unknown; content?: unknown; description?: unknown; tags?: unknown };
  const title = typeof p.title === 'string' ? p.title : '';
  if (platform === 'substack') {
    const body = typeof p.content === 'string' ? p.content : '';
    return [title, body].filter(Boolean).join('\n\n');
  }
  const description = typeof p.description === 'string' ? p.description : '';
  const tags = Array.isArray(p.tags) ? p.tags.filter((t): t is string => typeof t === 'string' && t.length > 0) : [];
  return [title, description, tags.length ? `Tags: ${tags.join(', ')}` : ''].filter(Boolean).join('\n\n');
}

export type PostUrlCheck = { ok: true; url: string | null } | { ok: false; error: string };

/** Optional post URL: empty is fine; anything else must be a valid https URL. */
export function validatePostUrl(raw: unknown): PostUrlCheck {
  if (raw === undefined || raw === null) return { ok: true, url: null };
  if (typeof raw !== 'string') return { ok: false, error: 'Enter the post link as text.' };
  const value = raw.trim();
  if (!value) return { ok: true, url: null };
  if (value.length > 2048) return { ok: false, error: 'That link is too long.' };
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return { ok: false, error: 'Enter a full link starting with https://.' };
  }
  if (parsed.protocol !== 'https:' || !parsed.hostname.includes('.')) {
    return { ok: false, error: 'Enter a full link starting with https://.' };
  }
  return { ok: true, url: parsed.toString() };
}
