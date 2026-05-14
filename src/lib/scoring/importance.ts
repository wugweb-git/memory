export function memoryImportance(params: { recurrence: number; strategic: number; novelty: number; emotional: number }) {
  const score = params.recurrence * 0.25 + params.strategic * 0.35 + params.novelty * 0.2 + params.emotional * 0.2;
  return Number(Math.min(1, score).toFixed(3));
}
