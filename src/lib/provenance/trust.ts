export function computeSourceTrust(params: { historicalAccuracy: number; humanAuthenticity: number }) {
  return Number((params.historicalAccuracy * 0.6 + params.humanAuthenticity * 0.4).toFixed(3));
}
