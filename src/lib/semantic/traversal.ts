export function traverseGraph(start: string, edges: Array<{ from: string; to: string }>, depth = 2) {
  const visited = new Set<string>([start]);
  let frontier = [start];
  for (let i = 0; i < depth; i++) {
    const next: string[] = [];
    for (const node of frontier) {
      for (const e of edges) {
        if (e.from === node && !visited.has(e.to)) {
          visited.add(e.to);
          next.push(e.to);
        }
      }
    }
    frontier = next;
  }
  return [...visited];
}
