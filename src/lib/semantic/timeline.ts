export function buildSemanticTimeline(events: Array<{ at: string; type: string; label: string }>) {
  return [...events].sort((a, b) => +new Date(a.at) - +new Date(b.at));
}
