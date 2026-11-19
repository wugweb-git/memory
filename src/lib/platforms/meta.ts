/** Facebook Page post: text only. */
export function buildFacebookPayload(params: { content: string; title?: string; tags?: string[] }) {
  const hashtags = (params.tags || []).map((t) => `#${t.replace(/\s+/g, "")}`).join(" ");
  return { platform: "facebook", payload: `${params.content}\n\n${hashtags}`.trim(), metadata: { title: params.title || null } };
}

/** Instagram posts need an image: pass `imageUrl` (publicly reachable HTTPS) in the metadata. */
export function buildInstagramPayload(params: { content: string; title?: string; tags?: string[]; imageUrl?: string }) {
  const hashtags = (params.tags || []).map((t) => `#${t.replace(/\s+/g, "")}`).join(" ");
  return {
    platform: "instagram",
    payload: { caption: `${params.content}\n\n${hashtags}`.trim().slice(0, 2200), imageUrl: params.imageUrl ?? null },
    metadata: { title: params.title || null },
  };
}
