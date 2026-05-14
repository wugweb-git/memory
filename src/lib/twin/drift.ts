export function twinDrift(current: number, expected: number) {
  return Number(Math.abs(current - expected).toFixed(3));
}
