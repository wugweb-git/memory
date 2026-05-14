export function chooseModelByBudget(params: { budgetRemaining: number; qualityNeed: "low" | "medium" | "high" }) {
  if (params.budgetRemaining < 1) return "gemini";
  if (params.qualityNeed === "high") return "claude";
  if (params.qualityNeed === "medium") return "gpt";
  return "gemini";
}
