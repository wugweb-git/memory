export function burnoutSignal(stress: number, energy: number, recoveryHours: number) {
  const score = stress * 0.5 + (1 - energy) * 0.4 + (recoveryHours < 7 ? 0.1 : 0);
  return { risk: Number(Math.min(1, score).toFixed(3)), flagged: score > 0.7 };
}
