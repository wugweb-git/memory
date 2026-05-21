const clamp = (n: number, min = 0, max = 1) => Math.max(min, Math.min(max, n));

export interface DriftInput {
  previous: Record<string, number>;
  current: Record<string, number>;
}

export interface DriftResult {
  driftScore: number;
  changedKeys: string[];
  severe: boolean;
}

export function detectTwinDrift(input: DriftInput): DriftResult {
  const keys = new Set([...Object.keys(input.previous), ...Object.keys(input.current)]);
  const changedKeys: string[] = [];
  let deltaSum = 0;

  for (const key of keys) {
    const prev = input.previous[key] ?? 0.5;
    const curr = input.current[key] ?? 0.5;
    const delta = Math.abs(prev - curr);
    if (delta > 0.08) changedKeys.push(key);
    deltaSum += delta;
  }

  const driftScore = clamp(deltaSum / Math.max(1, keys.size));
  return { driftScore, changedKeys, severe: driftScore > 0.25 };
}
