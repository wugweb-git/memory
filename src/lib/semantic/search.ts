export function semanticSearch(query: string, corpus: Array<{ id: string; text: string }>) {
  const q = query.toLowerCase();
  return corpus.filter((c) => c.text.toLowerCase().includes(q));
}
