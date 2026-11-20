/** X (Twitter) allows 280 characters per post; longer content becomes a reply thread. */
export const X_MAX_CHARS = 280;

/** Split text into posts of at most X_MAX_CHARS, breaking on paragraph, then sentence, then word boundaries. */
export function splitIntoThread(text: string, max = X_MAX_CHARS): string[] {
  const clean = text.trim();
  if (!clean) return [];
  if (clean.length <= max) return [clean];
  const posts: string[] = [];
  let rest = clean;
  while (rest.length > max) {
    const slice = rest.slice(0, max);
    let cut = Math.max(slice.lastIndexOf("\n\n"), slice.lastIndexOf(". "), slice.lastIndexOf("\n"));
    if (cut < max * 0.4) cut = slice.lastIndexOf(" ");
    // No break point: hard-split at exactly max characters (cut + 1 would be max + 1).
    const end = cut <= 0 ? max : cut + 1;
    posts.push(rest.slice(0, end).trim());
    rest = rest.slice(end).trim();
  }
  if (rest) posts.push(rest);
  return posts;
}

export function buildXPayload(params: { content: string; title?: string; tags?: string[] }) {
  const hashtags = (params.tags || []).map((t) => `#${t.replace(/\s+/g, "")}`).join(" ");
  const posts = splitIntoThread(`${params.content}${hashtags ? `\n\n${hashtags}` : ""}`);
  return { platform: "x", payload: posts, metadata: { title: params.title || null } };
}
