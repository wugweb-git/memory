export function unresolvedLoopTracker<T extends { id: string; resolved?: boolean }>(items: T[]) {
  return items.filter((x) => !x.resolved).map((x) => x.id);
}
