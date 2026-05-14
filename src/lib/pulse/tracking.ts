export function pulseSnapshot(input: { motivation: number; energy: number; stress: number; attention: number }) {
  return { ...input, capturedAt: new Date().toISOString() };
}
