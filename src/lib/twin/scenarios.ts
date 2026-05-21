/** Scenario generator based on user persona */
export interface ScenarioParams { mode: string; traits: Record<string, number>; context: string; }
export interface ScenarioResult { scenario: string; confidence: number; recommendedAction: string; }

export function generateScenario(params: ScenarioParams): ScenarioResult {
  const modeConfidence = params.traits.confidence ?? 0.5;
  const baseConfidence = modeConfidence * 0.75;
  const scenarios: Record<string, [string, string]> = {
    architect: ["Evaluate long-term strategy alignment", "Project future outcomes"],
    founder: ["Assess market opportunity fit", "Identify quick-win initiatives"],
    operator: ["Optimize current workflow", "Deploy tactical improvements"],
  };
  const [scenario, action] = scenarios[params.mode] ?? scenarios.operator;
  return { scenario, confidence: baseConfidence, recommendedAction: action };
}