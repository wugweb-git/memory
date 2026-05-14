export function recordProvenanceHistory(event: { artifactId: string; source: string; authorType: string }) {
  return { ...event, at: new Date().toISOString() };
}
