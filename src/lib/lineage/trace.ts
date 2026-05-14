export function buildLineageTrace(event: { id: string; layer: string; sourceIds?: string[] }) {
  return { ...event, timestamp: new Date().toISOString() };
}
