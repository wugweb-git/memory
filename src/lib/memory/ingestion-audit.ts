export function createIngestionAudit(event: { source: string; status: string; details?: Record<string, unknown> }) {
  return { ...event, createdAt: new Date().toISOString() };
}
