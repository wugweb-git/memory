export function resurfaceForgottenContext(items: Array<{ id: string; lastSeenAt: string; importance: number }>) {
  return [...items]
    .sort((a, b) => +new Date(a.lastSeenAt) - +new Date(b.lastSeenAt))
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 20);
}
