export function pulseMomentum(current: number, previous: number) {
  return Number((current - previous).toFixed(3));
}
