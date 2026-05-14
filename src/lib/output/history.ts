export function appendOutputHistory(history: Array<{ version: number; content: string }>, content: string) {
  const nextVersion = history.length ? history[history.length - 1].version + 1 : 1;
  return [...history, { version: nextVersion, content }];
}
