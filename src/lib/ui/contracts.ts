export const UI_API = {
  outputGenerate: "/api/output/generate",
  outputSchedule: "/api/output/schedule",
  outputHistory: "/api/output/history",
  healthSystem: "/api/admin/system-health",
  healthPersona: "/api/admin/persona-health",
  healthOutput: "/api/admin/output-health",
  healthRecommendation: "/api/admin/recommendation-health",
  automationRules: "/api/automation/rules",
} as const;

export function resolveUserId(explicit?: string | null) {
  if (explicit && explicit.trim()) return explicit;
  if (typeof window !== "undefined") {
    const fromStorage = window.localStorage.getItem("identity_prism_user_id");
    if (fromStorage) return fromStorage;
  }
  return "system_user";
}
