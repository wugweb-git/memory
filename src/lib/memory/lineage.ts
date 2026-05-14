export function buildMemoryLineage(packetId: string, parents: string[] = []) {
  return { packetId, parents, depth: parents.length };
}
