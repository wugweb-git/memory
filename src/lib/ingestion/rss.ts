export async function ingestRss(payload: { feedUrl: string; items: Array<{ title: string; url: string }> }) {
  return { source: "rss", accepted: true, count: payload.items.length };
}
