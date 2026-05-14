export function buildMediumPayload(params: { content: string; title?: string; tags?: string[] }) {
  return {
    platform: "medium",
    payload: { title: params.title || "Untitled", content: params.content, tags: params.tags || [] },
  };
}
