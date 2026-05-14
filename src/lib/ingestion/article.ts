export async function ingestExternalArticle(payload: { url: string; title?: string; content?: string }) {
  return { source: "article", accepted: true, payload };
}
