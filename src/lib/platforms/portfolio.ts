export function buildPortfolioPayload(params: { content: string; title?: string; tags?: string[] }) {
  return {
    platform: "portfolio",
    payload: {
      title: params.title || "Generated Narrative",
      body: params.content,
      tags: params.tags || [],
      visibility: "public",
    },
  };
}
