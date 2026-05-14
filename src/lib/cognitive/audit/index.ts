export function auditHallucinationRisk(confidence: number, sourceCoverage: number) {
  return { risk: Number((1 - (confidence * 0.6 + sourceCoverage * 0.4)).toFixed(3)) };
}
