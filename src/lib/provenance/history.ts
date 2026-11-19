export interface ProvenanceHistoryEvent {
  artifactId: string;
  source: string;
  authorType: string;
  at: string;
}

/**
 * Builds an in-memory provenance event. There is no provenance table yet, so
 * this is NOT persisted; callers that need a ledger should write the event to
 * execution_audit_logs (eventType "provenance") until a dedicated table lands.
 */
export function recordProvenanceHistory(event: { artifactId: string; source: string; authorType: string }): ProvenanceHistoryEvent {
  return { ...event, at: new Date().toISOString() };
}
