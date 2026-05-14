export function createAuditEvent(event: { actor: string; action: string; target: string; status: string }) {
  return { ...event, at: new Date().toISOString() };
}
