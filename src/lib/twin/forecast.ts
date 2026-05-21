const clamp = (n: number, min = 0, max = 1) => Math.max(min, Math.min(max, n));

export interface TraitForecastInput {
  current: Record<string, number>;
  velocity: Record<string, number>;
  horizon?: number;
}

export interface TraitForecastResult {
  projected: Record<string, number>;
  confidence: number;
}

export function forecastTraits(input: TraitForecastInput): TraitForecastResult {
  const horizon = Math.max(1, input.horizon ?? 3);
  const projected: Record<string, number> = {};
  const keys = new Set([...Object.keys(input.current), ...Object.keys(input.velocity)]);

  for (const key of keys) {
    const current = input.current[key] ?? 0.5;
    const velocity = input.velocity[key] ?? 0;
    projected[key] = clamp(current + velocity * horizon);
  }

  const volatility = Object.values(input.velocity).reduce((sum, v) => sum + Math.abs(v), 0) / Math.max(1, Object.keys(input.velocity).length);
  return { projected, confidence: clamp(1 - volatility) };
}
