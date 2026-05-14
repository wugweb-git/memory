export function routeModel(taskType: string) {
  if (taskType.includes("analysis")) return "claude";
  if (taskType.includes("creative")) return "gpt";
  return "gemini";
}
