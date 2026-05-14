export async function syncPortfolioRecord(data: { id: string; title: string; url?: string }) {
  return { synced: true, target: "portfolio", data };
}
