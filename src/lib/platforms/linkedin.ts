export function buildLinkedInPayload(params: { content: string; title?: string; tags?: string[] }) {
  const hashtags = (params.tags || []).map((t) => `#${t.replace(/\s+/g, "")}`).join(" ");
  return { platform: "linkedin", payload: `${params.content}\n\n${hashtags}`.trim(), metadata: { title: params.title || null } };
}
