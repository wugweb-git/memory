export function forecastBehavior(trend: number, volatility: number) {
  return { next: Number((trend - volatility * 0.3).toFixed(3)) };
}
