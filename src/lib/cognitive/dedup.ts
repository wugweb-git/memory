/**
 * Filters out recommendations that have been recently suggested.
 * Rule: Normalize strings (lowercase + trim) for robust matching.
 * Note: Returns a new object — does not mutate the input.
 */
export function dedup(output: any, history: any[]) {
  const norm = (s: string) => s.toLowerCase().trim();

  const previousRecs = new Set(
    history
      .flatMap(h => h.recommendations || [])
      .map((r: string) => norm(r))
  );

  return {
    ...output,
    recommendations: output.recommendations.filter(
      (rec: string) => !previousRecs.has(norm(rec))
    )
  };
}
